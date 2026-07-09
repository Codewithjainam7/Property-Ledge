import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("PropertyLedge Invoice Automation starting...");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Authenticate the user via JWT or verify Service Role Key
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    let isAuthenticated = false;
    if (token === supabaseServiceKey) {
      isAuthenticated = true;
    } else if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const today = new Date();
    const dayOfMonth = today.getUTCDate();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Running PropertyLedge automation for day: ${dayOfMonth}, date: ${todayStr}`);

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
              await supabase.functions.invoke('send-email', {
                body: {
                  to: tenantEmail,
                  subject: `New Invoice ${invoiceNumber} from PropertyLedge`,
                  templateType: "invoice",
                  variables: {
                    tenantName,
                    propertyAddress: propData?.address || '',
                    senderName: "Property Ledge Management",
                    senderEmail: "manager@propertyledge.com.au",
                    invoiceNumber,
                    dueDate: dueDateStr,
                    totalAmount,
                    isReminder: false
                  }
                }
              });
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
        // Only send reminder if not sent today already
        const lastReminder = inv.reminder_sent_at ? new Date(inv.reminder_sent_at) : null;
        const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        if (lastReminder && lastReminder > oneDayAgo) {
          console.log(`Skipping reminder for invoice ${inv.invoice_number} — already sent today.`);
          continue;
        }

        await supabase.functions.invoke('send-email', {
          body: {
            to: inv.tenant_email,
            subject: `Payment Overdue: Invoice ${inv.invoice_number} - PropertyLedge`,
            templateType: "invoice",
            variables: {
              tenantName: inv.tenant_name,
              propertyAddress: inv.property_address,
              senderName: "Property Ledge Management",
              senderEmail: "manager@propertyledge.com.au",
              invoiceNumber: inv.invoice_number,
              dueDate: inv.due_date,
              totalAmount: inv.total_amount,
              isReminder: true
            }
          }
        });

        // Update last reminder timestamp
        await supabase.from('invoices').update({ reminder_sent_at: new Date().toISOString() }).eq('id', inv.id);
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Critical error in PropertyLedge automation:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
