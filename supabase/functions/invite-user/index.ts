import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the JWT to ensure they are authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { email, role, property_id, permissions } = await req.json()

    if (!email || !role || !property_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, role, property_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify the caller is the owner of the property
    const { data: property, error: propError } = await supabaseClient
      .from('properties')
      .select('owner_id')
      .eq('id', property_id)
      .single()

    if (propError || property.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not own this property' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Create a Supabase admin client to invite the user
    // The service role key is automatically injected by Deno locally and in production
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if the user already exists in auth
    // We cannot query auth.users directly via SQL easily without security definer functions, 
    // but the admin API allows it or we can just try to invite.
    
    console.log(`Inviting ${email} for role ${role} on property ${property_id}`);

    // Send the invite email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
       console.error("Invite error:", inviteError);
       // If the user already exists, inviteError might say so. We can still try to add them to the team.
    }

    // The user's ID is created immediately even if they haven't accepted yet.
    // If they already existed, we need to get their ID.
    let invitedUserId = inviteData?.user?.id;

    if (!invitedUserId) {
        // Fallback: If they already existed, get their ID from our public user_profiles table if it exists
        // Or wait, we can fetch from admin API.
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        if (existingUser) {
            invitedUserId = existingUser.id;
        } else {
             return new Response(JSON.stringify({ error: 'Failed to create or find user' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }
    }

    // Insert them into the property_team
    const { error: teamError } = await supabaseAdmin
      .from('property_team')
      .upsert({
        property_id: property_id,
        user_id: invitedUserId,
        role: role,
        can_view_property: permissions?.can_view_property ?? true,
        can_view_lease: permissions?.can_view_lease ?? false,
        can_create_lease: permissions?.can_create_lease ?? false,
        can_edit_lease: permissions?.can_edit_lease ?? false,
        can_manage_tenants: permissions?.can_manage_tenants ?? false,
        can_renew_lease: permissions?.can_renew_lease ?? false,
        can_terminate_lease: permissions?.can_terminate_lease ?? false,
      }, { onConflict: 'property_id,user_id' })

    if (teamError) {
      console.error("Team insertion error:", teamError);
      return new Response(JSON.stringify({ error: 'Failed to assign user to team' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true, message: `Invited ${email} to property team.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
