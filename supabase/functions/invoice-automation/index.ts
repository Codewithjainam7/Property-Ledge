import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Invoice Automation!");

serve(async (req) => {
  try {
    // 1. Create a Supabase client with the Auth context of the logged in user, or Service Role Key if called by pg_cron
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // We use the service role key to bypass RLS since this is run automatically by the server
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Get today's day of the month (e.g. 1-31)
    const today = new Date();
    const dayOfMonth = today.getUTCDate();
    
    console.log(`Running automation for day: ${dayOfMonth}`);

    // 3. Find all invoice_templates where automation_day = today
    // AND auto_approve is true (meaning we should actually generate it)
    const { data: templates, error: templateError } = await supabase
      .from('invoice_templates')
      .select('*')
      .eq('automation_day', dayOfMonth)
      .eq('auto_approve', true);

    if (templateError) {
      throw new Error(`Failed to fetch templates: ${templateError.message}`);
    }

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: "No automations scheduled for today." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${templates.length} templates to process.`);

    let generatedCount = 0;

    // 4. Generate Invoices
    for (const template of templates) {
      // Calculate due date based on default_due_days
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (template.default_due_days || 14));

      // Calculate total amount from items
      const items = typeof template.items === 'string' ? JSON.parse(template.items) : (template.items || []);
      const subtotal = items.reduce((sum: number, item: any) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
      const taxRate = parseFloat(template.tax_rate) || 0;
      const totalAmount = subtotal + (subtotal * (taxRate / 100));

      const newInvoice = {
        user_id: template.user_id,
        template_id: template.id,
        // Assuming we map it to property_id if it existed, but for now we just use what the template has
        invoice_number: `INV-AUTO-${Math.floor(Math.random() * 100000)}`,
        status: template.auto_send_email ? 'Sent' : 'Unpaid',
        total_amount: totalAmount,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        notes: template.default_notes || 'Auto-generated invoice.',
      };

      const { error: insertError } = await supabase
        .from('invoices')
        .insert(newInvoice);

      if (insertError) {
        console.error(`Error generating invoice for template ${template.id}:`, insertError);
      } else {
        generatedCount++;
        // NOTE: In the future, if template.auto_send_email is TRUE, 
        // this is where you would call Resend/SendGrid API to email the tenant.
      }
    }

    return new Response(JSON.stringify({ 
      message: "Automation completed successfully.",
      processed: templates.length,
      generated: generatedCount 
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
