import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Invoice Automation!");

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const dayOfMonth = today.getUTCDate();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`Running automation for day: ${dayOfMonth}`);

    // --- 1. GENERATE RECURRING INVOICES ---
    const { data: templates, error: templateError } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('automation_day', dayOfMonth)
      .eq('auto_approve', true);

    if (templateError) throw new Error(`Failed to fetch templates: ${templateError.message}`);

    let generatedCount = 0;

    if (templates && templates.length > 0) {
      for (const template of templates) {
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (template.default_due_days || 14));

        const items = typeof template.items === 'string' ? JSON.parse(template.items) : (template.items || []);
        const subtotal = items.reduce((sum: number, item: any) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
        const taxRate = parseFloat(template.tax_rate) || 0;
        const totalAmount = subtotal + (subtotal * (taxRate / 100));

        // If template has linked properties, generate one invoice per property
        const propertyIds = template.property_ids || [];
        
        if (propertyIds.length === 0) {
          // Fallback if no properties linked, just generate a generic invoice
          const newInvoice = {
            user_id: template.user_id,
            template_id: template.id,
            invoice_number: `INV-AUTO-${Math.floor(Math.random() * 100000)}`,
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
            // Fetch property and lease info
            const { data: propData } = await supabase.from('properties').select('address').eq('id', pid).single();
            const { data: leaseData } = await supabase.from('leases').select('id, tenant_id, tenant(first_name, last_name, email)').eq('property_id', pid).eq('status', 'Active').single();
            
            const tenantName = leaseData?.tenant ? `${leaseData.tenant.first_name} ${leaseData.tenant.last_name}` : 'Unknown Tenant';
            const tenantEmail = leaseData?.tenant?.email || '';

            const newInvoice = {
              user_id: template.user_id,
              template_id: template.id,
              property_id: pid,
              lease_id: leaseData?.id || null,
              invoice_number: `INV-${pid.split('-')[0].toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
              status: template.auto_send_email ? 'Sent' : 'Draft',
              total_amount: totalAmount,
              issue_date: issueDate.toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0],
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
          }
        }
      }
    }

    // --- 2. MARK OVERDUE INVOICES ---
    const { error: overdueError } = await supabase
      .from('invoices')
      .update({ status: 'Overdue' })
      .in('status', ['Sent', 'Viewed', 'Unpaid'])
      .lt('due_date', todayStr);
    
    if (overdueError) console.error("Error marking invoices overdue:", overdueError);

    // --- 3. APPLY LATE FEES ---
    // Fetch Overdue invoices where late fee hasn't been applied and late_fee_amount > 0
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'Overdue')
      .eq('late_fee_applied', false)
      .gt('late_fee_amount', 0);

    let lateFeesApplied = 0;
    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const inv of overdueInvoices) {
        const dueDate = new Date(inv.due_date);
        const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
        
        if (daysLate >= (inv.late_fee_days || 0)) {
          // Apply the late fee
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

    return new Response(JSON.stringify({ 
      message: "Automation completed successfully.",
      generatedInvoices: generatedCount,
      lateFeesApplied: lateFeesApplied
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Critical error in automation:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
