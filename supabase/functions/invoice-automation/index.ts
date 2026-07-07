import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("PropertyLedge Invoice Automation starting...");

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const dayOfMonth = today.getUTCDate();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Running PropertyLedge automation for day: ${dayOfMonth}, date: ${todayStr}`);

    // ─── HELPER: Send email via Resend ───
    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not set, skipping email.");
        return;
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PropertyLedge <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Resend failed for ${to}: ${errText}`);
      } else {
        console.log(`Email sent successfully to ${to}`);
      }
    };

    // ─── HELPER: Build invoice email HTML ───
    const buildInvoiceEmail = (tenantName: string, propertyAddress: string, invoiceNumber: string, dueDate: string, totalAmount: number, isReminder = false) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isReminder ? 'Invoice Reminder' : 'New Invoice'} - PropertyLedge</title></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#22333b;padding:40px 40px 30px;text-align:center;">
          <span style="font-size:13px;font-weight:700;color:#a9927d;letter-spacing:3px;text-transform:uppercase;display:block;margin-bottom:8px;">PropertyLedge</span>
          <span style="font-size:22px;font-weight:900;color:#ffffff;">Billing & Invoices</span>
        </td></tr>
        <tr><td style="padding:40px 40px 20px;">
          <h1 style="font-size:24px;font-weight:800;color:#22333b;margin:0 0 16px;text-align:center;">
            ${isReminder ? 'Payment Reminder ⚠️' : 'New Invoice Received 📄'}
          </h1>
          <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:30px;text-align:center;">
            Hi ${tenantName || "Tenant"}, ${isReminder ? 'this is a friendly reminder that your invoice is due.' : 'a new invoice has been automatically generated for your property.'}
          </p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f2f4f3;border:1px solid rgba(34,51,59,0.1);border-radius:12px;padding:24px;margin-bottom:30px;">
            <tr><td style="padding-bottom:12px;">
              <div style="font-size:12px;color:#a9927d;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Property</div>
              <div style="font-size:16px;color:#22333b;font-weight:bold;margin-top:4px;">${propertyAddress || "N/A"}</div>
            </td></tr>
            <tr><td style="padding-bottom:12px;border-top:1px solid rgba(34,51,59,0.1);padding-top:12px;">
              <div style="font-size:12px;color:#a9927d;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Invoice Number</div>
              <div style="font-size:16px;color:#22333b;font-weight:bold;margin-top:4px;">${invoiceNumber}</div>
            </td></tr>
            <tr><td style="padding-top:12px;border-top:1px solid rgba(34,51,59,0.1);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%">
                    <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Amount Due</div>
                    <div style="font-size:22px;color:#a9927d;font-weight:900;margin-top:4px;">$${Number(totalAmount || 0).toFixed(2)}</div>
                  </td>
                  <td width="50%">
                    <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Due Date</div>
                    <div style="font-size:16px;color:#ef4444;font-weight:bold;margin-top:4px;">${new Date(dueDate).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#22333b;line-height:1.6;margin-bottom:24px;background:#f2f4f3;padding:16px;border-radius:8px;border-left:4px solid #a9927d;">
            Please ensure payment is made by the due date. If you have any questions, please contact your property manager.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">This email was sent automatically by PropertyLedge Billing Automation.</p>
          <p style="font-size:12px;color:#9ca3af;margin:6px 0 0;">&copy; ${new Date().getFullYear()} PropertyLedge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ─── 1. GENERATE & EMAIL RECURRING INVOICES ───
    const { data: templates, error: templateError } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('automation_day', dayOfMonth)
      .eq('auto_approve', true);

    if (templateError) throw new Error(`Failed to fetch templates: ${templateError.message}`);

    let generatedCount = 0;
    let emailsSent = 0;

    if (templates && templates.length > 0) {
      for (const template of templates) {
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (template.default_due_days || 14));

        const items = typeof template.items === 'string' ? JSON.parse(template.items) : (template.items || []);
        const subtotal = items.reduce((sum: number, item: any) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
        const taxRate = parseFloat(template.tax_rate) || 0;
        const totalAmount = subtotal + (subtotal * (taxRate / 100));

        const propertyIds = template.property_ids || [];

        if (propertyIds.length === 0) {
          // No properties linked — create a generic invoice
          const invoiceNumber = `INV-AUTO-${Math.floor(Math.random() * 100000)}`;
          const newInvoice = {
            user_id: template.user_id,
            template_id: template.id,
            invoice_number: invoiceNumber,
            status: template.auto_send_email ? 'Sent' : 'Draft',
            total_amount: totalAmount,
            issue_date: issueDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            notes: template.default_notes || 'Auto-generated invoice.',
            late_fee_amount: template.late_fee_amount || 0,
            late_fee_days: template.late_fee_days || 0,
            late_fee_applied: false
          };
          await supabase.from('invoices').insert(newInvoice);
          generatedCount++;
        } else {
          for (const pid of propertyIds) {
            const { data: propData } = await supabase.from('properties').select('address').eq('id', pid).single();
            const { data: leaseData } = await supabase.from('leases')
              .select('id, tenant_id')
              .eq('property_id', pid)
              .eq('status', 'Active')
              .maybeSingle();

            // Get tenant info
            let tenantName = 'Unknown Tenant';
            let tenantEmail = '';
            if (leaseData?.tenant_id) {
              const { data: tenantData } = await supabase.from('tenants')
                .select('first_name, last_name, email')
                .eq('id', leaseData.tenant_id)
                .maybeSingle();
              if (tenantData) {
                tenantName = `${tenantData.first_name} ${tenantData.last_name}`.trim();
                tenantEmail = tenantData.email || '';
              }
            }

            const invoiceNumber = `INV-${pid.split('-')[0].toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
            const dueDateStr = dueDate.toISOString().split('T')[0];

            const newInvoice = {
              user_id: template.user_id,
              template_id: template.id,
              property_id: pid,
              lease_id: leaseData?.id || null,
              invoice_number: invoiceNumber,
              status: template.auto_send_email ? 'Sent' : 'Draft',
              total_amount: totalAmount,
              issue_date: issueDate.toISOString().split('T')[0],
              due_date: dueDateStr,
              notes: template.default_notes || 'Auto-generated invoice.',
              property_address: propData?.address || '',
              tenant_name: tenantName,
              tenant_email: tenantEmail,
              late_fee_amount: template.late_fee_amount || 0,
              late_fee_days: template.late_fee_days || 0,
              late_fee_applied: false
            };
            await supabase.from('invoices').insert(newInvoice);
            generatedCount++;

            // ── Send email if auto_send_email is ON and tenant has an email ──
            if (template.auto_send_email && tenantEmail) {
              const html = buildInvoiceEmail(tenantName, propData?.address || '', invoiceNumber, dueDateStr, totalAmount, false);
              await sendEmail(tenantEmail, `New Invoice ${invoiceNumber} from PropertyLedge`, html);
              emailsSent++;
            }
          }
        }
      }
    }

    // ─── 2. MARK OVERDUE INVOICES ───
    const { error: overdueError } = await supabase
      .from('invoices')
      .update({ status: 'Overdue' })
      .in('status', ['Sent', 'Viewed', 'Unpaid'])
      .lt('due_date', todayStr);

    if (overdueError) console.error("Error marking invoices overdue:", overdueError);

    // ─── 3. SEND OVERDUE REMINDER EMAILS ───
    const { data: overdueToEmail } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'Overdue')
      .lt('due_date', todayStr)
      .not('tenant_email', 'is', null)
      .neq('tenant_email', '');

    let remindersSent = 0;
    if (overdueToEmail && overdueToEmail.length > 0) {
      for (const inv of overdueToEmail) {
        const html = buildInvoiceEmail(inv.tenant_name, inv.property_address, inv.invoice_number, inv.due_date, inv.total_amount, true);
        await sendEmail(inv.tenant_email, `Payment Overdue: Invoice ${inv.invoice_number} - PropertyLedge`, html);
        remindersSent++;
      }
    }

    // ─── 4. APPLY LATE FEES ───
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'Overdue')
      .eq('late_fee_applied', false)
      .gt('late_fee_amount', 0);

    let lateFeesApplied = 0;
    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const inv of overdueInvoices) {
        const dueDateObj = new Date(inv.due_date);
        const daysLate = Math.floor((today.getTime() - dueDateObj.getTime()) / (1000 * 3600 * 24));
        if (daysLate >= (inv.late_fee_days || 0)) {
          const newAmount = parseFloat(inv.total_amount) + parseFloat(inv.late_fee_amount);
          const newNotes = (inv.notes || '') + `\nLate fee of $${inv.late_fee_amount} applied on ${todayStr}.`;
          await supabase.from('invoices').update({
            total_amount: newAmount,
            notes: newNotes,
            late_fee_applied: true
          }).eq('id', inv.id);
          lateFeesApplied++;
        }
      }
    }

    console.log(`Automation complete: ${generatedCount} invoices generated, ${emailsSent} emails sent, ${remindersSent} reminders sent, ${lateFeesApplied} late fees applied.`);

    return new Response(JSON.stringify({
      message: "PropertyLedge automation completed successfully.",
      generatedInvoices: generatedCount,
      emailsSent,
      remindersSent,
      lateFeesApplied,
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Critical error in PropertyLedge automation:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
