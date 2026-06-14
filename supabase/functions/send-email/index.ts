import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "Not Specified";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Not Specified";
    return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return "Not Specified";
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse request body
    const { to, subject, templateType, variables } = await req.json();

    if (!to || !subject || !templateType || !variables) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, templateType, variables" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const mailtrapToken = Deno.env.get("MAILTRAP_API_TOKEN") || "";
    if (!mailtrapToken) {
      throw new Error("MAILTRAP_API_TOKEN secret is not set.");
    }

    // ─── Step 1: Get Mailtrap Account ID ───
    console.log("Step 1: Fetching Mailtrap accounts...");
    const accountsRes = await fetch("https://mailtrap.io/api/accounts", {
      headers: { "Api-Token": mailtrapToken }
    });

    if (!accountsRes.ok) {
      const errText = await accountsRes.text();
      throw new Error(`Failed to fetch Mailtrap accounts (${accountsRes.status}): ${errText}`);
    }

    const accounts = await accountsRes.json();
    if (!accounts || accounts.length === 0) {
      throw new Error("No Mailtrap accounts found for this API token.");
    }

    const accountId = accounts[0].id;
    console.log(`Found Mailtrap account ID: ${accountId}`);

    // ─── Step 2: Get Sandbox Inbox ID ───
    console.log("Step 2: Fetching sandbox inboxes...");
    const inboxesRes = await fetch(`https://mailtrap.io/api/accounts/${accountId}/inboxes`, {
      headers: { "Api-Token": mailtrapToken }
    });

    if (!inboxesRes.ok) {
      const errText = await inboxesRes.text();
      throw new Error(`Failed to fetch sandbox inboxes (${inboxesRes.status}): ${errText}`);
    }

    const inboxes = await inboxesRes.json();
    if (!inboxes || inboxes.length === 0) {
      throw new Error("No sandbox inboxes found. Please create one at https://mailtrap.io/inboxes");
    }

    const inboxId = inboxes[0].id;
    console.log(`Found sandbox inbox ID: ${inboxId}`);

    // ─── Step 3: Build the email HTML ───
    let htmlContent = "";

    if (templateType === "tenant-invite") {
      const { firstName, propertyAddress, inviteUrl, rentAmount, leaseStart } = variables;
      htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to Property Ledge</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141419;border:1px solid #2a2a35;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px;text-align:center;">
          <span style="font-size:24px;font-weight:900;color:#818cf8;">PROPERTY LEDGE</span>
        </td></tr>
        <tr><td style="padding:20px 40px 40px;">
          <h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0 0 16px;text-align:center;">Welcome to Your New Home, ${firstName || "Tenant"}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#9ca3af;margin-bottom:30px;text-align:center;">Your landlord has invited you to access your digital resident portal.</p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin-bottom:30px;">
            <tr><td style="padding-bottom:8px;font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Property</td></tr>
            <tr><td style="padding-bottom:16px;font-size:16px;color:#ffffff;font-weight:bold;">${propertyAddress || "N/A"}</td></tr>
            <tr><td>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Rent</td>
                  <td width="50%" style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Lease Start</td>
                </tr>
                <tr>
                  <td style="font-size:18px;color:#818cf8;font-weight:800;padding-top:4px;">$${rentAmount || "0"}/wk</td>
                  <td style="font-size:16px;color:#ffffff;font-weight:bold;padding-top:4px;">${formatDate(leaseStart)}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
            <tr><td>
              <a href="${inviteUrl || "#"}" target="_blank" style="background:#6366f1;color:#ffffff;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;">Accept Lease &amp; Set Password</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#4b5563;text-align:center;margin:0;">If you did not request this, please ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #2a2a35;text-align:center;">
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; 2026 Property Ledge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else if (templateType === "team-invite") {
      const { propertyAddress, inviteUrl, role, landlordEmail } = variables;
      htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Property Ledge Team Invite</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#141419;border:1px solid #2a2a35;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 40px 20px;text-align:center;">
          <span style="font-size:24px;font-weight:900;color:#818cf8;">PROPERTY LEDGE</span>
        </td></tr>
        <tr><td style="padding:20px 40px 40px;">
          <h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0 0 16px;text-align:center;">Join the Management Team</h1>
          <p style="font-size:15px;line-height:1.6;color:#9ca3af;margin-bottom:30px;text-align:center;">You have been invited by <strong>${landlordEmail || "your landlord"}</strong> to manage <strong>${propertyAddress || "a property"}</strong>.</p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1e1e2a;border:1px solid #2a2a35;border-radius:12px;padding:20px;margin-bottom:30px;text-align:center;">
            <tr><td style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;padding-bottom:8px;">Assigned Role</td></tr>
            <tr><td style="font-size:20px;color:#818cf8;font-weight:900;">${role || "Team Member"}</td></tr>
          </table>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align:center;margin-bottom:24px;">
            <tr><td>
              <a href="${inviteUrl || "#"}" target="_blank" style="background:#6366f1;color:#ffffff;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;">Accept Team Invite</a>
            </td></tr>
          </table>
          <p style="font-size:12px;color:#4b5563;text-align:center;margin:0;">If you did not request this, please ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #2a2a35;text-align:center;">
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; 2026 Property Ledge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else {
      throw new Error(`Unknown templateType: ${templateType}`);
    }

    // ─── Step 4: Send email via Mailtrap Sandbox API ───
    const sendUrl = `https://sandbox.api.mailtrap.io/api/send/${inboxId}`;
    console.log(`Step 4: Sending email to ${to} via ${sendUrl}`);

    const mailtrapRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Api-Token": mailtrapToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: {
          email: "hello@example.com",
          name: "Property Ledge"
        },
        to: [{ email: to }],
        subject: subject,
        html: htmlContent,
        category: templateType === "tenant-invite" ? "Tenant Invitation" : "Team Invitation"
      })
    });

    if (!mailtrapRes.ok) {
      const errText = await mailtrapRes.text();
      console.error(`Mailtrap send failed (${mailtrapRes.status}):`, errText);
      throw new Error(`Mailtrap API failed (${mailtrapRes.status}): ${errText}`);
    }

    const resJson = await mailtrapRes.json();
    console.log("Email sent successfully:", JSON.stringify(resJson));

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully", data: resJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Error in send-email function:", err.message || err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
