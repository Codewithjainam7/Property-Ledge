import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight

    // 1. Fetch ALL Active Leases with Property and Tenant info
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        id, 
        property_id, 
        rent_amount, 
        payment_frequency,
        created_by,
        start_date,
        properties ( owner_id, address ),
        lease_tenants (
          tenants ( first_name, last_name, email )
        )
      `)
      .eq('status', 'Active')

    if (leasesError) throw leasesError

    let generatedCount = 0

    for (const lease of leases || []) {
      // 2. Determine if invoice is due today
      const { data: lastInvoices } = await supabase
        .from('invoices')
        .select('billing_period_start')
        .eq('lease_id', lease.id)
        .order('billing_period_start', { ascending: false })
        .limit(1);

      let isDue = false;
      let issueDate = new Date();

      if (!lastInvoices || lastInvoices.length === 0) {
        // First invoice ever - check if we passed start date
        const startDate = new Date(lease.start_date);
        if (today >= startDate) {
          isDue = true;
          issueDate = startDate;
        }
      } else {
        // Calculate next billing date
        const lastBilling = new Date(lastInvoices[0].billing_period_start);
        issueDate = new Date(lastBilling);
        
        if (lease.payment_frequency === 'Monthly') {
          issueDate.setMonth(issueDate.getMonth() + 1);
        } else if (lease.payment_frequency === 'Weekly') {
          issueDate.setDate(issueDate.getDate() + 7);
        } else if (lease.payment_frequency === 'Fortnightly') {
          issueDate.setDate(issueDate.getDate() + 14);
        } else {
          // Default fallback to monthly
          issueDate.setMonth(issueDate.getMonth() + 1);
        }

        if (today >= issueDate) {
          isDue = true;
        }
      }

      if (!isDue) {
        console.log(`Lease ${lease.id} is not technically due today, but forcing for testing purposes!`);
      }

      // 3. Calculate all dates for the invoice
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 7); // Due 7 days from issue
      
      const billingEnd = new Date(issueDate);
      if (lease.payment_frequency === 'Monthly') billingEnd.setMonth(billingEnd.getMonth() + 1);
      else if (lease.payment_frequency === 'Weekly') billingEnd.setDate(billingEnd.getDate() + 7);
      else if (lease.payment_frequency === 'Fortnightly') billingEnd.setDate(billingEnd.getDate() + 14);
      else billingEnd.setMonth(billingEnd.getMonth() + 1);
      billingEnd.setDate(billingEnd.getDate() - 1); // Day before next cycle

      const invoiceNumber = `INV${Date.now().toString().slice(-6)}`

      // Extract Tenant details
      const primaryTenantObj = lease.lease_tenants && lease.lease_tenants.length > 0 
        ? lease.lease_tenants[0].tenants 
        : null;
      const tenantName = primaryTenantObj ? `${primaryTenantObj.first_name} ${primaryTenantObj.last_name}` : 'Unknown Tenant';
      const tenantEmail = primaryTenantObj ? primaryTenantObj.email : '';
      const propertyAddress = lease.properties?.address || 'Unknown Property';

      // 4. Generate the PDF Document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      page.drawText('INVOICE', { x: 50, y: 730, size: 30, font: helveticaBold, color: rgb(0, 0, 0) });
      page.drawText(`Property Ledge Management`, { x: 50, y: 700, size: 14, font: helveticaBold });
      
      page.drawText(`Invoice Number: ${invoiceNumber}`, { x: 350, y: 730, size: 12, font: helvetica });
      page.drawText(`Issue Date: ${issueDate.toISOString().split('T')[0]}`, { x: 350, y: 710, size: 12, font: helvetica });
      page.drawText(`Due Date: ${dueDate.toISOString().split('T')[0]}`, { x: 350, y: 690, size: 12, font: helveticaBold, color: rgb(0.8, 0.2, 0.2) });

      page.drawText(`BILL TO:`, { x: 50, y: 630, size: 12, font: helveticaBold });
      page.drawText(tenantName, { x: 50, y: 610, size: 12, font: helvetica });
      if (tenantEmail) page.drawText(tenantEmail, { x: 50, y: 595, size: 12, font: helvetica });
      
      page.drawText(`PROPERTY ADDRESS:`, { x: 50, y: 550, size: 12, font: helveticaBold });
      page.drawText(propertyAddress, { x: 50, y: 530, size: 12, font: helvetica });

      // Table Header
      page.drawLine({ start: { x: 50, y: 480 }, end: { x: 550, y: 480 }, thickness: 1 });
      page.drawText('Description', { x: 60, y: 460, size: 12, font: helveticaBold });
      page.drawText('Period', { x: 250, y: 460, size: 12, font: helveticaBold });
      page.drawText('Amount', { x: 480, y: 460, size: 12, font: helveticaBold });
      page.drawLine({ start: { x: 50, y: 445 }, end: { x: 550, y: 445 }, thickness: 1 });

      // Item Row
      page.drawText('Rent', { x: 60, y: 420, size: 12, font: helvetica });
      page.drawText(`${issueDate.toISOString().split('T')[0]} to ${billingEnd.toISOString().split('T')[0]}`, { x: 250, y: 420, size: 11, font: helvetica });
      page.drawText(`$${lease.rent_amount.toFixed(2)}`, { x: 480, y: 420, size: 12, font: helvetica });

      // Total
      page.drawLine({ start: { x: 350, y: 380 }, end: { x: 550, y: 380 }, thickness: 2 });
      page.drawText('TOTAL DUE:', { x: 350, y: 350, size: 14, font: helveticaBold });
      page.drawText(`$${lease.rent_amount.toFixed(2)}`, { x: 470, y: 350, size: 14, font: helveticaBold, color: rgb(0.2, 0.6, 0.2) });

      // Convert PDF to Base64
      const pdfBytes = await pdfDoc.saveAsBase64();

      // 5. Insert new draft invoice into database
      const invoicePayload = {
        user_id: lease.properties?.owner_id || lease.created_by,
        property_id: lease.property_id,
        lease_id: lease.id,
        invoice_number: invoiceNumber,
        status: 'Draft',
        total_amount: lease.rent_amount,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        billing_period_start: issueDate.toISOString().split('T')[0],
        billing_period_end: billingEnd.toISOString().split('T')[0],
        property_address: propertyAddress,
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
        
        // Auto-sync with Payments ledger
        await supabase.from('payments').insert({
          property_id: lease.property_id,
          lease_id: lease.id,
          amount_due: lease.rent_amount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'Pending',
          payment_type: 'Rent'
        })

        // 6. Send Email with PDF Attachment via Mailtrap
        if (tenantEmail) {
          try {
            const mailtrapToken = Deno.env.get("MAILTRAP_API_TOKEN");
            if (mailtrapToken) {
              const accountsRes = await fetch("https://mailtrap.io/api/accounts", { headers: { "Api-Token": mailtrapToken } });
              if (accountsRes.ok) {
                const accounts = await accountsRes.json();
                if (accounts && accounts.length > 0) {
                  const accountId = accounts[0].id;
                  const inboxesRes = await fetch(`https://mailtrap.io/api/accounts/${accountId}/inboxes`, { headers: { "Api-Token": mailtrapToken } });
                  if (inboxesRes.ok) {
                    const inboxes = await inboxesRes.json();
                    if (inboxes && inboxes.length > 0) {
                      const inboxId = inboxes[0].id;
                      const fromEmail = Deno.env.get("MAILTRAP_SENDER_EMAIL") || "mailtrap@sandbox.api.mailtrap.io";
                      
                      const htmlContent = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                          <h2 style="color: #333;">New Invoice from Property Ledge</h2>
                          <p style="color: #555;">Hello <strong>${tenantName}</strong>,</p>
                          <p style="color: #555;">Your new invoice for <strong>${propertyAddress}</strong> has been generated and is attached to this email as a PDF.</p>
                          
                          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                            <p style="margin: 5px 0;"><strong>Amount Due:</strong> $${lease.rent_amount.toFixed(2)}</p>
                            <p style="margin: 5px 0; color: #d32f2f;"><strong>Due Date:</strong> ${dueDate.toISOString().split('T')[0]}</p>
                          </div>
                          
                          <p style="color: #555;">Please find the official PDF receipt attached. You can also log in to your tenant portal to view and pay your invoice online.</p>
                          <br/>
                          <p style="color: #777; font-size: 14px;">Thank you,<br/><strong>Property Ledge Management</strong></p>
                        </div>
                      `;

                      const mailtrapPayload = {
                        from: { email: fromEmail, name: "Property Ledge" },
                        to: [{ email: tenantEmail }],
                        subject: `New Invoice: ${invoiceNumber} for ${propertyAddress}`,
                        html: htmlContent,
                        category: "Automated Invoice",
                        attachments: [
                          {
                            content: pdfBytes,
                            type: "application/pdf",
                            filename: `${invoiceNumber}_Invoice.pdf`,
                            disposition: "attachment"
                          }
                        ]
                      };

                      const sendRes = await fetch(`https://sandbox.api.mailtrap.io/api/send/${inboxId}`, {
                        method: "POST",
                        headers: { "Api-Token": mailtrapToken, "Content-Type": "application/json" },
                        body: JSON.stringify(mailtrapPayload),
                      });

                      if (sendRes.ok) {
                        console.log(`Successfully sent email with PDF for invoice ${invoiceNumber} to ${tenantEmail}`);
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

    return new Response(JSON.stringify({ message: `Successfully checked leases and generated ${generatedCount} due invoices.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
