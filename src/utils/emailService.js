import { supabase } from '../lib/supabaseClient'

export async function sendEmail(type, data) {
  try {
    const { data: result, error } = await supabase.functions.invoke(
      'send-email',
      { body: { type, data } }
    )
    if (error) {
      console.error('Email send failed:', error)
      return { success: false, error }
    }
    if (result && result.error) {
      console.error('Email rejected by Resend/Edge Function:', result.error)
      return { success: false, error: result.error }
    }
    console.log('Email sent:', type, result)
    return { success: true, result }
  } catch (err) {
    console.error('Email service error:', err)
    return { success: false, error: err.message }
  }
}

export async function emailLeaveApplied(application, employee, manager) {
  return sendEmail('leave_applied', {
    manager_email: manager.email,
    manager_name: manager.name,
    employee_name: employee.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days,
    reason: application.reason
  })
}

export async function emailManagerApproved(application, employee, manager) {
  return sendEmail('leave_manager_approved', {
    employee_email: employee.email,
    employee_name: employee.name,
    manager_name: manager.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days
  })
}

export async function emailManagerRejected(application, employee, manager, comments) {
  return sendEmail('leave_manager_rejected', {
    employee_email: employee.email,
    employee_name: employee.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days,
    comments
  })
}

export async function emailHRActionNeeded(application, employee, manager, hrEmployee) {
  return sendEmail('leave_hr_action_needed', {
    hr_email: hrEmployee.email,
    hr_name: hrEmployee.name,
    employee_name: employee.name,
    manager_name: manager.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days
  })
}

export async function emailFullyApproved(application, employee) {
  return sendEmail('leave_fully_approved', {
    employee_email: employee.email,
    employee_name: employee.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days
  })
}

export async function emailRejectedByHR(application, employee, comments) {
  return sendEmail('leave_rejected_by_hr', {
    employee_email: employee.email,
    employee_name: employee.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days,
    hr_comments: comments
  })
}

export async function emailLeaveCancelled(application, employee, manager) {
  return sendEmail('leave_cancelled', {
    manager_email: manager.email,
    manager_name: manager.name,
    employee_name: employee.name,
    leave_type: application.leave_type_name,
    from_date: application.from_date,
    to_date: application.to_date,
    days: application.days
  })
}

export async function emailRegularizationSubmitted(reg, employee, manager) {
  return sendEmail('regularization_submitted', {
    manager_email: manager.email,
    manager_name: manager.name,
    employee_name: employee.name,
    date: reg.date,
    req_in: reg.req_in,
    req_out: reg.req_out,
    reason: reg.reason
  })
}

export async function emailRegularizationApproved(reg, employee) {
  return sendEmail('regularization_approved', {
    employee_email: employee.email,
    employee_name: employee.name,
    date: reg.date,
    req_in: reg.req_in,
    req_out: reg.req_out
  })
}

export async function emailApprovalReminder(approver, pendingCount) {
  return sendEmail('approval_reminder', {
    approver_email: approver.email,
    approver_name: approver.name,
    pending_count: pendingCount
  })
}
