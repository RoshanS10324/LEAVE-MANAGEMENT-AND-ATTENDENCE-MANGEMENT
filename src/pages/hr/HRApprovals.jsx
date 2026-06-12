import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import BRDTag from '../../components/BRDTag';
import { emailFullyApproved, emailRejectedByHR, emailRegularizationApproved } from '../../utils/emailService';

export default function HRApprovals() {
  const { employee } = useAuth();
  
  const [activeTab, setActiveTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectType, setRejectType] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([fetchLeaves(), fetchRegularizations()]).finally(() => setIsLoadingData(false));
  }, []);

  const fetchLeaves = async () => {
    const { data } = await supabase
      .from('leave_applications')
      .select('*, employees!emp_id(name, department, designation, manager_id, email), leave_types(name, max_days), manager:employees!manager_id(name)')
      .eq('status', 'Manager_Approved')
      .order('manager_actioned_at', { ascending: true });
    if (data) setLeaves(data);
  };

  const fetchRegularizations = async () => {
    const { data } = await supabase
      .from('regularizations')
      .select('*, employees!emp_id(name, department, email), manager:employees!manager_id(name)')
      .eq('status', 'Manager_Approved')
      .order('manager_actioned_at', { ascending: true });
    if (data) setRegularizations(data);
  };

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ---- HR LEAVE VALIDATION ----
  const handleValidateLeave = async (leave) => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();

      // 1. Update status to Approved
      const { error: appErr } = await supabase
        .from('leave_applications')
        .update({ status: 'Approved', hr_actioned_at: now, balance_updated: true })
        .eq('id', leave.id);
      if (appErr) throw appErr;

      // 2. Deduct leave balance
      const { data: currentBalance, error: balFetchErr } = await supabase
        .from('leave_balances')
        .select('used')
        .eq('emp_id', leave.emp_id)
        .eq('leave_type_id', leave.leave_type_id)
        .eq('year', currentYear)
        .single();
        
      if (!balFetchErr && currentBalance) {
        await supabase
          .from('leave_balances')
          .update({ used: currentBalance.used + leave.days })
          .eq('emp_id', leave.emp_id)
          .eq('leave_type_id', leave.leave_type_id)
          .eq('year', currentYear);
      }

      // 3. Insert leave approval record
      await supabase.from('leave_approvals').insert({
        application_id: leave.id,
        approver_id: employee?.id,
        level: 2,
        status: 'Approved',
        actioned_at: now
      });

      // 4. Notify employee
      const leaveTypeName = leave.leave_types?.name || 'Leave';
      const { error: notifErr1 } = await supabase.from('notifications').insert({
        user_id: leave.emp_id,
        message: `✓ Your ${leaveTypeName} leave from ${leave.from_date} to ${leave.to_date} (${leave.days} days) has been fully approved. Your leave balance has been updated.`
      });
      if (notifErr1) console.error("Notif Error (Emp):", notifErr1);

      // 5. Notify manager
      if (leave.manager_id) {
        const { error: notifErr2 } = await supabase.from('notifications').insert({
          user_id: leave.manager_id,
          message: `HR has validated ${leave.employees?.name}'s leave request.`
        });
        if (notifErr2) console.error("Notif Error (Mgr):", notifErr2);
      }

      // 6. Audit log
      await supabase.from('audit_log').insert({
        action: 'HR_APPROVED_LEAVE',
        entity: 'leave_applications',
        new_value: { application_id: leave.id, days: leave.days, leave_type: leave.leave_type_id, balance_updated: true }
      });

      if (leave.employees?.email) {
        const leaveTypeName = leave.leave_types?.name || 'Leave';
        emailFullyApproved(
          { leave_type_name: leaveTypeName, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
          { name: leave.employees.name || 'Employee', email: leave.employees.email }
        ).catch(err => console.error('Email failed:', err));
      }

      showToast('Leave validated and balance updated');
      fetchLeaves();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectLeave = async (leave) => {
    if (!rejectComment) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('leave_applications')
        .update({ 
          status: 'Rejected', 
          hr_actioned_at: now, 
          hr_comments: rejectComment,
          balance_updated: false
        })
        .eq('id', leave.id);
      if (error) throw error;

      await supabase.from('leave_approvals').insert({
        application_id: leave.id,
        approver_id: employee?.id,
        level: 2,
        status: 'Rejected',
        comments: rejectComment,
        actioned_at: now
      });

      const leaveTypeName = leave.leave_types?.name || 'Leave';
      
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: leave.emp_id,
        message: `Your ${leaveTypeName} leave request (${leave.from_date}–${leave.to_date}) was rejected by HR. Reason: ${rejectComment}`
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      if (leave.manager_id) {
        const { error: notifErrMgr } = await supabase.from('notifications').insert({
          user_id: leave.manager_id,
          message: `HR rejected ${leave.employees?.name}'s leave request.`
        });
        if (notifErrMgr) console.error("Notif Error:", notifErrMgr);
      }

      if (leave.employees?.email) {
        const leaveTypeName = leave.leave_types?.name || 'Leave';
        emailRejectedByHR(
          { leave_type_name: leaveTypeName, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
          { name: leave.employees.name || 'Employee', email: leave.employees.email },
          rejectComment
        ).catch(err => console.error('Email failed:', err));
      }

      showToast('Leave request rejected by HR');
      closeModal();
      fetchLeaves();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- HR REGULARIZATION REVIEW ----
  const calculateHours = (inTime, outTime) => {
    if (!inTime || !outTime) return 0;
    const dateStr = '1970-01-01T';
    const t1 = new Date(dateStr + inTime).getTime();
    const t2 = new Date(dateStr + outTime).getTime();
    let diff = (t2 - t1) / (1000 * 60 * 60);
    if (diff < 0) diff += 24;
    return diff.toFixed(2);
  };

  const handleApproveReg = async (reg) => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const totalHours = parseFloat(calculateHours(reg.req_in, reg.req_out));

      // 1. Update to Approved
      const { error: appErr } = await supabase
        .from('regularizations')
        .update({ status: 'Approved', hr_actioned_at: now, attendance_updated: false })
        .eq('id', reg.id);
      if (appErr) throw appErr;

      // 2. Update attendance record
      const { data: attRecord, error: attFetchErr } = await supabase
        .from('attendance')
        .select('id')
        .eq('emp_id', reg.emp_id)
        .eq('date', reg.date)
        .maybeSingle();

      if (attRecord) {
        await supabase
          .from('attendance')
          .update({
            check_in: reg.req_in,
            check_out: reg.req_out,
            total_hours: totalHours,
            status: 'Present',
            is_late: false,
            early_leave: false,
            source: 'regularized'
          })
          .eq('id', attRecord.id);
      } else {
        await supabase.from('attendance').insert({
          emp_id: reg.emp_id,
          date: reg.date,
          check_in: reg.req_in,
          check_out: reg.req_out,
          total_hours: totalHours,
          status: 'Present',
          source: 'regularized'
        });
      }

      // 3. Mark attendance updated
      await supabase
        .from('regularizations')
        .update({ attendance_updated: true })
        .eq('id', reg.id);

      // 4. Payroll sync simulation
      await supabase
        .from('regularizations')
        .update({ payroll_synced: true, payroll_synced_at: now })
        .eq('id', reg.id);

      await supabase.from('audit_log').insert({
        action: 'PAYROLL_SYNC',
        entity: 'regularizations',
        new_value: { date: reg.date, emp_id: reg.emp_id, synced_at: now, updated_hours: totalHours }
      });

      // 5. Notify employee
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: reg.emp_id,
        message: `✓ Your attendance regularization for ${reg.date} has been approved. Attendance updated: ${reg.req_in} – ${reg.req_out}. Payroll sync complete.`
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      if (reg.employees?.email) {
        emailRegularizationApproved(
          { date: reg.date, req_in: reg.req_in, req_out: reg.req_out },
          { name: reg.employees.name || 'Employee', email: reg.employees.email }
        ).catch(err => console.error('Email failed:', err));
      }

      showToast('Regularization approved, attendance updated, payroll synced');
      fetchRegularizations();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectReg = async (reg) => {
    if (!rejectComment) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('regularizations')
        .update({ 
          status: 'Rejected', 
          hr_actioned_at: now,
          hr_comments: rejectComment
        })
        .eq('id', reg.id);
      if (error) throw error;

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: reg.emp_id,
        message: `✗ Your regularization request for ${reg.date} was rejected by HR. Reason: ${rejectComment}`
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      showToast('Regularization rejected');
      closeModal();
      fetchRegularizations();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectSubmit = () => {
    if (rejectType === 'leave') {
      handleRejectLeave(rejectItem);
    } else {
      handleRejectReg(rejectItem);
    }
  };

  const closeModal = () => {
    setRejectItem(null);
    setRejectType(null);
    setRejectComment('');
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HR Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">Validate manager-approved leaves and regularizations</p>
        </div>
        <BRDTag label="BRD FR-4: Approval Routing" />
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'leaves' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Leave Validation
          {leaves.length > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-bold">
              {leaves.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('regularizations')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'regularizations' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Regularization Review
          {regularizations.length > 0 && (
            <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-bold">
              {regularizations.length}
            </span>
          )}
        </button>
      </div>

      {/* LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
          {isLoadingData ? (
            <div className="p-8 space-y-4">
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm font-medium">No leaves awaiting HR validation.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-6">
              {leaves.map((leave) => (
                <div key={leave.id} className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 px-4 -mx-4 hover:bg-slate-50/50 transition-colors rounded-xl group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {(leave.employees?.name || '?').split(' ').map(n => n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{leave.employees?.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">{leave.employees?.department || 'N/A'}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        {leave.leave_types?.name} • {leave.from_date} to {leave.to_date} ({leave.days} days)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 max-w-sm">
                        <span className="font-semibold text-slate-500">Reason:</span> {leave.reason}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => { setRejectItem(leave); setRejectType('leave'); }}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors h-auto"
                    >
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleValidateLeave(leave)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors h-auto"
                    >
                      Validate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REGULARIZATIONS TAB */}
      {activeTab === 'regularizations' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] overflow-hidden">
          {isLoadingData ? (
            <div className="p-8 space-y-4">
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
            </div>
          ) : regularizations.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm font-medium">No regularizations awaiting HR review.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-6">
              {regularizations.map((reg) => (
                <div key={reg.id} className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 px-4 -mx-4 hover:bg-slate-50/50 transition-colors rounded-xl group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {(reg.employees?.name || '?').split(' ').map(n => n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{reg.employees?.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">{reg.employees?.department || 'N/A'}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        Date: <span className="font-semibold text-slate-700">{reg.date}</span> • Requested: <span className="font-semibold text-slate-700">{reg.req_in} – {reg.req_out}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 max-w-sm">
                        <span className="font-semibold text-slate-500">Reason:</span> {reg.reason}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => { setRejectItem(reg); setRejectType('reg'); }}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors h-auto"
                    >
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleApproveReg(reg)}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 transition-colors h-auto"
                    >
                      Validate & Sync
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all scale-100 opacity-100">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Reject Request</h3>
            <p className="text-sm font-medium text-slate-500 mb-5">
              Please provide a reason for rejecting this {rejectType === 'leave' ? 'leave' : 'regularization'} request from {rejectItem.employees?.name}.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 resize-none text-sm"
              placeholder="E.g. Insufficient leave balance..."
              rows="3"
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="ghost" 
                onClick={closeModal}
                disabled={isLoading}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRejectSubmit}
                disabled={isLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-semibold"
              >
                {isLoading ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transform transition-all ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
