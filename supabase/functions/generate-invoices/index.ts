import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

console.log("Invoice Generator Edge Function started.")

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
      throw new Error('Missing Supabase environment variables')
    }

    // Use service role key to bypass RLS for system jobs
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

    // 1. Fetch all active leases with their property details
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id, 
        property_id, 
        rent_amount, 
        payment_frequency,
        created_by,
        properties ( owner_id, address ),
        lease_tenants (
          tenants ( first_name, last_name, email )
        )
      `)
      .eq('status', 'Active')

    if (leasesError) throw leasesError

    console.log(`Found ${leases?.length || 0} active leases.`)

    if (!leases || leases.length === 0) {
      return new Response(JSON.stringify({ message: "No active leases found." }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // First day of current month
    const billingStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    
    // Determine the due date (e.g. 7 days from start of month)
    const dueDateObj = new Date(currentYear, currentMonth, 7)
    const dueDate = dueDateObj.toISOString().split('T')[0]

    let generatedCount = 0

    // 2. Iterate through leases and generate invoices if missing
    for (const lease of leases) {
      // Check if an invoice already exists for this lease for the current billing period
      const { data: existingInvoices, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('billing_period_start', billingStart)

      if (checkError) {
        console.error(`Error checking invoices for lease ${lease.id}:`, checkError)
        continue
      }

      if (existingInvoices && existingInvoices.length > 0) {
        console.log(`Invoice already exists for lease ${lease.id} for billing period ${billingStart}`)
        continue
      }

      // Generate invoice number
      const invoiceNumber = `INV${Date.now().toString().slice(-6)}`

      // 3. Extract Tenant details safely
      const primaryTenantObj = lease.lease_tenants && lease.lease_tenants.length > 0 
        ? lease.lease_tenants[0].tenants 
        : null;
      const tenantName = primaryTenantObj ? `${primaryTenantObj.first_name} ${primaryTenantObj.last_name}` : 'Unknown Tenant';
      const tenantEmail = primaryTenantObj ? primaryTenantObj.email : '';

      // 4. Insert new draft invoice
      const invoicePayload = {
        user_id: lease.properties?.owner_id || lease.created_by, // Assign to property owner
        property_id: lease.property_id,
        lease_id: lease.id,
        invoice_number: invoiceNumber,
        status: 'Draft',
        total_amount: lease.rent_amount,
        issue_date: billingStart,
        due_date: dueDate,
        billing_period_start: billingStart,
        billing_period_end: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0], // Last day of month
        property_address: lease.properties?.address || '',
        tenant_name: tenantName,
        tenant_email: tenantEmail,
      }

      const { error: insertError } = await supabase
        .from('invoices')
        .insert(invoicePayload)

      if (insertError) {
        console.error(`Error inserting invoice for lease ${lease.id}:`, insertError)
      } else {
        console.log(`Generated invoice ${invoiceNumber} for lease ${lease.id}`)
        generatedCount++
        
        // Auto-sync with Phase 4 Ledger (Payments table)
        await supabase.from('payments').insert({
          property_id: lease.property_id,
          lease_id: lease.id,
          amount_due: lease.rent_amount,
          due_date: dueDate,
          status: 'Pending',
          payment_type: 'Rent'
        })

        // 4. Send Email via Mailtrap if tenant_email is available
        if (invoicePayload.tenant_email) {
          try {
            const mailtrapToken = Deno.env.get("MAILTRAP_API_TOKEN");
            if (mailtrapToken) {
              // ─── Step A: Get Mailtrap Account ID ───
              const accountsRes = await fetch("https://mailtrap.io/api/accounts", {
                headers: { "Api-Token": mailtrapToken }
              });
              if (accountsRes.ok) {
                const accounts = await accountsRes.json();
                if (accounts && accounts.length > 0) {
                  const accountId = accounts[0].id;
                  
                  // ─── Step B: Get Sandbox Inbox ID ───
                  const inboxesRes = await fetch(`https://mailtrap.io/api/accounts/${accountId}/inboxes`, {
                    headers: { "Api-Token": mailtrapToken }
                  });
                  if (inboxesRes.ok) {
                    const inboxes = await inboxesRes.json();
                    if (inboxes && inboxes.length > 0) {
                      const inboxId = inboxes[0].id;

                      // ─── Step C: Send the Email ───
                      const fromEmail = Deno.env.get("MAILTRAP_SENDER_EMAIL") || "mailtrap@sandbox.api.mailtrap.io";
                      
                      const htmlContent = `
                        <h2>New Invoice from Property Ledge</h2>
                        <p>Hello ${invoicePayload.tenant_name},</p>
                        <p>A new invoice has been generated for your lease at <strong>${invoicePayload.property_address}</strong>.</p>
                        <ul>
                          <li><strong>Invoice Number:</strong> ${invoicePayload.invoice_number}</li>
                          <li><strong>Amount Due:</strong> $${invoicePayload.total_amount}</li>
                          <li><strong>Due Date:</strong> ${invoicePayload.due_date}</li>
                        </ul>
                        <p>Please log in to your tenant portal to view and pay your invoice.</p>
                        <br/>
                        <p>Thank you,<br/>Property Ledge Management</p>
                      `;

                      const mailtrapPayload = {
                        from: { email: fromEmail, name: "Property Ledge" },
                        to: [{ email: invoicePayload.tenant_email }],
                        subject: `New Invoice Generated: ${invoicePayload.invoice_number}`,
                        html: htmlContent,
                        category: "Automated Invoice"
                      };

                      const sendRes = await fetch(`https://sandbox.api.mailtrap.io/api/send/${inboxId}`, {
                        method: "POST",
                        headers: { "Api-Token": mailtrapToken, "Content-Type": "application/json" },
                        body: JSON.stringify(mailtrapPayload),
                      });

                      if (sendRes.ok) {
                        console.log(`Successfully sent email for invoice ${invoiceNumber} to ${invoicePayload.tenant_email}`);
                        // Update status to 'Sent' in database
                        await supabase.from('invoices').update({ status: 'Sent' }).eq('invoice_number', invoiceNumber);
                      } else {
                        console.error(`Mailtrap send failed: ${await sendRes.text()}`);
                      }
                    }
                  }
                }
              }
            }
          } catch (emailErr) {
            console.error(`Failed to send email for invoice ${invoiceNumber}:`, emailErr);
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: `Successfully generated ${generatedCount} invoices.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
