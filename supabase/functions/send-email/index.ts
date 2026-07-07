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
    const reqBody = await req.json();
    const { to, subject, templateType, variables, attachmentBase64, attachmentFilename } = reqBody;

    if (!to || !subject || !templateType || !variables) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, templateType, variables" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY secret is not set.");
    }

    // ─── Build the email HTML ───
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
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; ${new Date().getFullYear()} Property Ledge. All rights reserved.</p>
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
          <p style="font-size:11px;color:#4b5563;margin:0;">&copy; ${new Date().getFullYear()} Property Ledge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else if (templateType === "tenant-welcome") {
      const { 
        tenantFirstName, propertyAddress, senderName, senderEmail,
        startDate, endDate, rentAmount, bondAmount, paymentFrequency, specialTerms
      } = variables;

      const leaseEndStr = endDate ? formatDate(endDate) : "Periodic / Month-to-Month";

      htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to Your New Home</title></head>
<body style="margin:0;padding:0;background-color:#f2f4f3;font-family:'Space Grotesk','Outfit','Inter',Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f2f4f3;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:#22333b;padding:48px 40px 36px;text-align:center;">
          <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#a9927d;letter-spacing:3px;text-transform:uppercase;">Property Ledge</p>
          <h1 style="margin:0 0 12px;font-size:32px;font-weight:900;color:#ffffff;line-height:1.2;">Welcome Home, ${tenantFirstName || "Tenant"}! 🏡</h1>
          <p style="margin:0;font-size:16px;color:#f2f4f3;line-height:1.5;opacity:0.9;">Your lease agreement has been confirmed. Please find your details and signed lease attached.</p>
        </td></tr>

        <!-- Property Card -->
        <tr><td style="padding:36px 40px 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f2f4f3;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:24px;">
            <tr><td>
              <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#a9927d;text-transform:uppercase;letter-spacing:1.5px;">Your Property</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#22333b;">${propertyAddress || "N/A"}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Lease Term -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#a9927d;text-transform:uppercase;letter-spacing:1.5px;">Lease Term</p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="48%" style="background:#ffffff;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22333b;opacity:0.7;text-transform:uppercase;">Start Date</p>
                <p style="margin:0;font-size:18px;font-weight:800;color:#22333b;">${formatDate(startDate)}</p>
              </td>
              <td width="4%" style="text-align:center;color:#a9927d;font-size:20px;font-weight:bold;">→</td>
              <td width="48%" style="background:#ffffff;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22333b;opacity:0.7;text-transform:uppercase;">End Date</p>
                <p style="margin:0;font-size:18px;font-weight:800;color:#22333b;">${leaseEndStr}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Financials -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#a9927d;text-transform:uppercase;letter-spacing:1.5px;">Financial Summary</p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="32%" style="background:#22333b;border-radius:16px;padding:20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a9927d;text-transform:uppercase;">Rent</p>
                <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">$${Number(rentAmount || 0).toLocaleString()}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#f2f4f3;opacity:0.8;">${(paymentFrequency || "Weekly").toLowerCase()}</p>
              </td>
              <td width="4%"></td>
              <td width="32%" style="background:#ffffff;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22333b;opacity:0.7;text-transform:uppercase;">Bond</p>
                <p style="margin:0;font-size:22px;font-weight:900;color:#22333b;">$${Number(bondAmount || 0).toLocaleString()}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#22333b;opacity:0.6;">deposit</p>
              </td>
              <td width="4%"></td>
              <td width="32%" style="background:#ffffff;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:20px;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#22333b;opacity:0.7;text-transform:uppercase;">Frequency</p>
                <p style="margin:0;font-size:18px;font-weight:900;color:#22333b;">${paymentFrequency || "Weekly"}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#22333b;opacity:0.6;">cycle</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${specialTerms ? `
        <!-- Special Conditions -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#a9927d;text-transform:uppercase;letter-spacing:1.5px;">Message from Landlord</p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f2f4f3;border-left:4px solid #a9927d;border-radius:0 12px 12px 0;padding:20px;">
            <tr><td style="font-size:14px;color:#22333b;line-height:1.7;white-space:pre-line;font-weight:500;">${specialTerms}</td></tr>
          </table>
        </td></tr>` : ''}

        <!-- From -->
        <tr><td style="padding:36px 40px 0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid rgba(34,51,59,0.1);border-radius:16px;padding:20px;">
            <tr>
              <td width="44" style="vertical-align:top;">
                <div style="width:44px;height:44px;background:#22333b;border-radius:50%;text-align:center;line-height:44px;font-size:18px;color:#a9927d;font-weight:800;">${(senderName || senderEmail || 'L').charAt(0).toUpperCase()}</div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#22333b;">${senderName || "Your Property Manager"}</p>
                <p style="margin:0;font-size:13px;color:#22333b;opacity:0.7;">${senderEmail || ""}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:40px 40px;text-align:center;margin-top:40px;">
          <p style="margin:0 0 8px;font-size:12px;color:#22333b;opacity:0.5;font-weight:500;">This email was securely delivered by Property Ledge.</p>
          <p style="margin:0;font-size:11px;color:#22333b;opacity:0.3;font-weight:600;">&copy; ${new Date().getFullYear()} Property Ledge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else if (templateType === "invoice") {
      const { 
        tenantName, propertyAddress, senderName, senderEmail,
        invoiceNumber, dueDate, totalAmount, isReminder
      } = variables;

      htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${isReminder ? 'Invoice Reminder' : 'New Invoice'}</title></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#4f46e5;padding:40px 40px 30px;text-align:center;">
          <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;">PROPERTY LEDGE</span>
        </td></tr>
        <tr><td style="padding:40px 40px 20px;">
          <h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 16px;text-align:center;">
            ${isReminder ? 'Payment Reminder ⚠️' : 'New Invoice Received 📄'}
          </h1>
          <p style="font-size:15px;line-height:1.6;color:#4b5563;margin-bottom:30px;text-align:center;">
            Hi ${tenantName || "Tenant"}, ${isReminder ? 'this is a friendly reminder that your invoice is due.' : 'a new invoice has been generated for your property.'}
          </p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f3f4f6;border-radius:12px;padding:24px;margin-bottom:30px;">
            <tr>
              <td style="padding-bottom:12px;">
                <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Property</div>
                <div style="font-size:16px;color:#111827;font-weight:bold;margin-top:4px;">${propertyAddress || "N/A"}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
                <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Invoice Number</div>
                <div style="font-size:16px;color:#111827;font-weight:bold;margin-top:4px;">${invoiceNumber || "N/A"}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;border-top:1px solid #e5e7eb;padding-top:12px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%">
                      <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Amount Due</div>
                      <div style="font-size:20px;color:#4f46e5;font-weight:900;margin-top:4px;">$${totalAmount || "0.00"}</div>
                    </td>
                    <td width="50%">
                      <div style="font-size:12px;color:#6b7280;font-weight:bold;text-transform:uppercase;">Due Date</div>
                      <div style="font-size:16px;color:#ef4444;font-weight:bold;margin-top:4px;">${formatDate(dueDate)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="font-size:14px;color:#4b5563;line-height:1.6;margin-bottom:24px;background:#e0e7ff;padding:16px;border-radius:8px;border-left:4px solid #4f46e5;">
            Please find the detailed invoice PDF attached to this email. It contains all payment instructions and line items.
          </p>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top:30px;">
            <tr>
              <td width="48" style="vertical-align:middle;">
                <div style="width:48px;height:48px;background:#4f46e5;border-radius:50%;text-align:center;line-height:48px;font-size:20px;color:#ffffff;font-weight:800;">
                  ${(senderName || senderEmail || 'L').charAt(0).toUpperCase()}
                </div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:#111827;">${senderName || "Your Property Manager"}</p>
                <p style="margin:0;font-size:14px;color:#6b7280;">${senderEmail || ""}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">This email was sent securely via Property Ledge.</p>
          <p style="font-size:12px;color:#9ca3af;margin:6px 0 0;">&copy; ${new Date().getFullYear()} Property Ledge. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else {
      throw new Error(`Unknown templateType: ${templateType}`);
    }

    const fromEmail = "onboarding@resend.dev"; 
    const fromName = variables?.senderName || "Property Ledge";

    const resendPayload: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: htmlContent,
      tags: [
        {
          name: 'category',
          value: templateType
        }
      ]
    };

    if (reqBody && reqBody.attachmentBase64) {
      resendPayload.attachments = [
        {
          filename: reqBody.attachmentFilename || "Document.pdf",
          content: reqBody.attachmentBase64.split(',')[1] || reqBody.attachmentBase64,
        }
      ];
    }

    // ─── Send email via Resend API ───
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error(`Resend API failed (${resendRes.status}):`, errText);
      throw new Error(`Resend API failed (${resendRes.status}): ${errText}`);
    }

    const resJson = await resendRes.json();
    console.log("Email sent successfully via Resend:", JSON.stringify(resJson));

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
