import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = 'LeaveFlow <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, data } = await req.json()
    const emailPayload = buildEmail(type, data)

    if (!emailPayload) {
      return new Response(
        JSON.stringify({ error: 'Unknown email type: ' + type }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: [emailPayload.to],
        subject: emailPayload.subject,
        html: emailPayload.html
      })
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(
        JSON.stringify({ error: result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildEmail(type: string, data: any) {
  const base = baseTemplate

  switch (type) {

    case 'leave_applied':
      return {
        to: data.manager_email,
        subject: `Leave Request: ${data.employee_name} — ${data.leave_type} (${data.days} day(s))`,
        html: base(`New Leave Request`, `
          <p>Hi ${data.manager_name},</p>
          <p><strong>${data.employee_name}</strong> has submitted a leave request
          that requires your approval.</p>
          ${leaveDetailsTable(data)}
          <p>Please log in to LeaveFlow to approve or reject this request.</p>
          ${ctaButton('Review Request', 'https://localhost:5173/manager/approvals')}
          <p style="color:#6b7280;font-size:13px">
            This is an automated notification from LeaveFlow.
          </p>
        `)
      }

    case 'leave_manager_approved':
      return {
        to: data.employee_email,
        subject: `Leave Update: Your ${data.leave_type} request was approved by your manager`,
        html: base('Leave Request Update', `
          <p>Hi ${data.employee_name},</p>
          <p>Your leave request has been <strong style="color:#16a34a">approved
          by your manager</strong> and is now pending HR validation.</p>
          ${leaveDetailsTable(data)}
          <p>You will receive another email once HR completes their review.</p>
          ${ctaButton('View My Leaves', 'https://localhost:5173/my-leaves')}
        `)
      }

    case 'leave_manager_rejected':
      return {
        to: data.employee_email,
        subject: `Leave Update: Your ${data.leave_type} request was rejected`,
        html: base('Leave Request Rejected', `
          <p>Hi ${data.employee_name},</p>
          <p>Your leave request has been <strong style="color:#dc2626">
          rejected by your manager</strong>.</p>
          ${leaveDetailsTable(data)}
          ${data.comments ? `
          <div style="background:#fef2f2;border-left:4px solid #dc2626;
                      padding:12px 16px;margin:16px 0;border-radius:4px">
            <strong>Reason:</strong> ${data.comments}
          </div>` : ''}
          <p>You may reapply or contact your manager for more details.</p>
          ${ctaButton('View My Leaves', 'https://localhost:5173/my-leaves')}
        `)
      }

    case 'leave_hr_action_needed':
      return {
        to: data.hr_email,
        subject: `HR Validation Required: ${data.employee_name} — ${data.leave_type}`,
        html: base('HR Validation Required', `
          <p>Hi ${data.hr_name},</p>
          <p>A leave request has been approved by the reporting manager
          and now requires HR validation.</p>
          ${leaveDetailsTable(data)}
          <p><strong>Approved by manager:</strong> ${data.manager_name}</p>
          ${ctaButton('Review Now', 'https://localhost:5173/hr/approvals')}
        `)
      }

    case 'leave_fully_approved':
      return {
        to: data.employee_email,
        subject: `Leave Approved: Your ${data.leave_type} is confirmed`,
        html: base('Leave Approved', `
          <p>Hi ${data.employee_name},</p>
          <p>Your leave request has been <strong style="color:#16a34a">
          fully approved</strong> by HR. Your leave balance has been updated.</p>
          ${leaveDetailsTable(data)}
          <p>Enjoy your time off!</p>
          ${ctaButton('View My Leaves', 'https://localhost:5173/my-leaves')}
        `)
      }

    case 'leave_rejected_by_hr':
      return {
        to: data.employee_email,
        subject: `Leave Rejected: Your ${data.leave_type} request`,
        html: base('Leave Request Rejected by HR', `
          <p>Hi ${data.employee_name},</p>
          <p>Your leave request has been <strong style="color:#dc2626">
          rejected by HR</strong>.</p>
          ${leaveDetailsTable(data)}
          ${data.hr_comments ? `
          <div style="background:#fef2f2;border-left:4px solid #dc2626;
                      padding:12px 16px;margin:16px 0;border-radius:4px">
            <strong>Reason from HR:</strong> ${data.hr_comments}
          </div>` : ''}
          ${ctaButton('View My Leaves', 'https://localhost:5173/my-leaves')}
        `)
      }

    case 'leave_cancelled':
      return {
        to: data.manager_email,
        subject: `Leave Cancelled: ${data.employee_name} cancelled their ${data.leave_type}`,
        html: base('Leave Cancelled', `
          <p>Hi ${data.manager_name},</p>
          <p><strong>${data.employee_name}</strong> has cancelled their
          leave request.</p>
          ${leaveDetailsTable(data)}
          ${ctaButton('View Team', 'https://localhost:5173/manager/team')}
        `)
      }

    case 'regularization_submitted':
      return {
        to: data.manager_email,
        subject: `Regularization Request: ${data.employee_name} — ${data.date}`,
        html: base('Attendance Regularization Request', `
          <p>Hi ${data.manager_name},</p>
          <p><strong>${data.employee_name}</strong> has submitted an
          attendance regularization request.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f8fafc">
              <td style="padding:8px 12px;border:1px solid #e2e8f0;
                         font-weight:500">Date</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">
                ${data.date}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;
                         font-weight:500">Requested time</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">
                ${data.req_in} – ${data.req_out}</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:8px 12px;border:1px solid #e2e8f0;
                         font-weight:500">Reason</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0">
                ${data.reason}</td>
            </tr>
          </table>
          ${ctaButton('Review Request',
            'https://localhost:5173/manager/approvals')}
        `)
      }

    case 'regularization_approved':
      return {
        to: data.employee_email,
        subject: `Regularization Approved: Attendance updated for ${data.date}`,
        html: base('Attendance Regularization Approved', `
          <p>Hi ${data.employee_name},</p>
          <p>Your attendance regularization for <strong>${data.date}</strong>
          has been <strong style="color:#16a34a">fully approved</strong>.
          Your attendance record has been updated and payroll has been
          notified.</p>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;
                      padding:12px 16px;margin:16px 0;border-radius:4px">
            Updated time: <strong>${data.req_in} – ${data.req_out}</strong>
          </div>
          ${ctaButton('View Attendance',
            'https://localhost:5173/attendance')}
        `)
      }

    case 'approval_reminder':
      return {
        to: data.approver_email,
        subject: `Reminder: ${data.pending_count} leave request(s) awaiting your approval`,
        html: base('Approval Reminder', `
          <p>Hi ${data.approver_name},</p>
          <p>You have <strong>${data.pending_count} pending leave
          request(s)</strong> that have been waiting for more than
          2 business days.</p>
          <p>Please review and action them at your earliest convenience.</p>
          ${ctaButton('Review Now',
            'https://localhost:5173/manager/approvals')}
        `)
      }

    default:
      return null
  }
}

function leaveDetailsTable(data: any) {
  return `
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="background:#f8fafc">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:500;width:40%">Employee</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${data.employee_name}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:500">Leave type</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${data.leave_type}</td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:500">Duration</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">
        ${data.from_date} – ${data.to_date} (${data.days} day(s))
      </td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:500">Reason</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">
        ${data.reason || '—'}
      </td>
    </tr>
  </table>`
}

function ctaButton(label: string, url: string) {
  return `
  <div style="text-align:center;margin:24px 0">
    <a href="${url}" style="background:#185FA5;color:#ffffff;
       padding:12px 28px;border-radius:8px;text-decoration:none;
       font-weight:500;font-size:14px;display:inline-block">
      ${label}
    </a>
  </div>`
}

function baseTemplate(title: string, body: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:
               -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="max-width:560px;margin:32px auto;padding:0 16px">
      <div style="background:#185FA5;padding:20px 24px;
                  border-radius:12px 12px 0 0">
        <div style="color:white;font-size:18px;font-weight:600">
          LeaveFlow
        </div>
        <div style="color:#bfdbfe;font-size:13px;margin-top:2px">
          HR Management System
        </div>
      </div>
      <div style="background:white;padding:24px;
                  border:1px solid #e2e8f0;border-top:none;
                  border-radius:0 0 12px 12px">
        <h2 style="margin:0 0 16px;font-size:18px;
                   font-weight:600;color:#0f172a">
          ${title}
        </h2>
        ${body}
      </div>
      <div style="text-align:center;padding:16px;
                  font-size:12px;color:#94a3b8">
        LeaveFlow — Automated Notification
        · Do not reply to this email
      </div>
    </div>
  </body>
  </html>`
}
