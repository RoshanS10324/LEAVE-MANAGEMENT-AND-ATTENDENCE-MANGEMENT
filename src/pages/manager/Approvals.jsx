import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import BRDTag from '../../components/BRDTag';
import { emailManagerApproved, emailHRActionNeeded, emailManagerRejected } from '../../utils/emailService';

export default function Approvals() {
  const { employee } = useAuth();
  
  const [activeTab, setActiveTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchLeaves();
      fetchRegularizations();
    }
  }, [employee]);

  const fetchLeaves = async () => {
    const { data } = await supabase
      .from('leave_applications')
      .select('*, employees!emp_id(name, department, designation, email), leave_types(name)')
      .eq('manager_id', employee.id)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });
    if (data) setLeaves(data);
  };

  const fetchRegularizations = async () => {
    const { data } = await supabase
      .from('regularizations')
      .select('*, employees!emp_id(name, department)')
      .eq('manager_id', employee.id)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });
    if (data) setRegularizations(data);
  };

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ---- LEAVE APPROVAL ----
  const handleApproveLeave = async (leave) => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('leave_applications')
        .update({ status: 'Manager_Approved', manager_actioned_at: now })
        .eq('id', leave.id);
      if (error) throw error;

      await supabase.from('leave_approvals').insert({
        application_id: leave.id,
        approver_id: employee.id,
        level: 1,
        status: 'Manager_Approved',
        actioned_at: now
      });

      const { data: hrEmployees } = await supabase
        .from('employees')
        .select('*')
        .in('role', ['hr', 'super_admin']);

      const leaveTypeName = leave.leave_types?.name || 'Leave';
      const empName = leave.employees?.name || 'Employee';

      if (hrEmployees && hrEmployees.length > 0) {
        const notifications = hrEmployees.map(hr => ({
          user_id: hr.id,
          message: `Manager approved ${empName} leave request (${leaveTypeName}, ${leave.days} days, ${leave.from_date}–${leave.to_date}). HR validation required.`
        }));
        await supabase.from('notifications').insert(notifications);

        hrEmployees.forEach(hr => {
          emailHRActionNeeded(
            { leave_type_name: leaveTypeName, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
            { name: empName, email: leave.employees?.email },
            employee,
            hr
          ).catch(err => console.error('Email failed:', err));
        });
      }

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: leave.emp_id,
        message: 'Your leave request has been approved by your manager and is now pending HR validation.'
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      if (leave.employees?.email) {
        emailManagerApproved(
          { leave_type_name: leaveTypeName, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
          { name: empName, email: leave.employees.email },
          employee
        ).catch(err => console.error('Email failed:', err));
      }

      await supabase.from('audit_log').insert({
        action: 'MANAGER_APPROVED_LEAVE',
        entity: 'leave_applications',
        new_value: { application_id: leave.id, status: 'Manager_Approved' }
      });

      showToast('Leave approved — sent to HR for validation');
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
          status: 'Manager_Rejected', 
          manager_actioned_at: now,
          manager_comments: rejectComment
        })
        .eq('id', leave.id);
      if (error) throw error;

      await supabase.from('leave_approvals').insert({
        application_id: leave.id,
        approver_id: employee.id,
        level: 1,
        status: 'Manager_Rejected',
        comments: rejectComment,
        actioned_at: now
      });

      const leaveTypeName = leave.leave_types?.name || 'Leave';
      const empName = leave.employees?.name || 'Employee';
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: leave.emp_id,
        message: `Your ${leaveTypeName} leave request (${leave.from_date}–${leave.to_date}) was rejected by your manager. Reason: ${rejectComment}`
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      if (leave.employees?.email) {
        emailManagerRejected(
          { leave_type_name: leaveTypeName, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
          { name: empName, email: leave.employees.email },
          employee,
          rejectComment
        ).catch(err => console.error('Email failed:', err));
      }

      await supabase.from('audit_log').insert({
        action: 'MANAGER_REJECTED_LEAVE',
        entity: 'leave_applications',
        new_value: { application_id: leave.id, status: 'Manager_Rejected' }
      });

      showToast('Leave request rejected');
      setRejectId(null);
      setRejectComment('');
      fetchLeaves();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- REGULARIZATION APPROVAL ----
  const handleApproveReg = async (reg) => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('regularizations')
        .update({ status: 'Manager_Approved', manager_actioned_at: now })
        .eq('id', reg.id);
      if (error) throw error;

      const empName = reg.employees?.name || 'Employee';
      const { data: hrEmployees } = await supabase
        .from('employees')
        .select('id')
        .in('role', ['hr', 'super_admin']);

      if (hrEmployees && hrEmployees.length > 0) {
        const notifications = hrEmployees.map(hr => ({
          user_id: hr.id,
          message: `Manager approved ${empName} regularization (${reg.date}). HR validation required.`
        }));
        await supabase.from('notifications').insert(notifications);
      }

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: reg.emp_id,
        message: 'Your regularization request has been approved by your manager and is now pending HR validation.'
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      showToast('Regularization approved — sent to HR');
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
          status: 'Manager_Rejected', 
          manager_actioned_at: now,
          manager_comments: rejectComment
        })
        .eq('id', reg.id);
      if (error) throw error;

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: reg.emp_id,
        message: `Your regularization request for ${reg.date} was rejected by your manager. Reason: ${rejectComment}`
      });
      if (notifErr) console.error("Notif Error:", notifErr);

      showToast('Regularization request rejected');
      setRejectId(null);
      setRejectComment('');
      fetchRegularizations();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review pending requests from your team</p>
        </div>
        <BRDTag label="BRD FR-4: Approval Routing" />
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'leaves' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Leave Requests
          {leaves.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
              {leaves.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('regularizations')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'regularizations' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Attendance Regularization
          {regularizations.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">
              {regularizations.length}
            </span>
          )}
        </button>
      </div>

      {/* LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {leaves.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No pending leave requests from your team.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {leaves.map((leave) => (
                <div key={leave.id} className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{leave.employees?.name}</h4>
                      <span className="text-xs text-gray-500">({leave.employees?.department || 'N/A'})</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">{leave.leave_types?.name}</span> • {leave.from_date} to {leave.to_date} ({leave.days} day{leave.days > 1 ? 's' : ''})
                    </div>
                    <div className="text-xs text-gray-500">
                      <strong>Reason:</strong> {leave.reason}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto">
                    {rejectId === leave.id ? (
                      <div className="flex items-center gap-2 w-full md:w-64">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleRejectLeave(leave)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setRejectId(null); setRejectComment(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setRejectId(leave.id)}
                          disabled={isLoading}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveLeave(leave)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REGULARIZATIONS TAB */}
      {activeTab === 'regularizations' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {regularizations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No pending regularization requests from your team.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {regularizations.map((reg) => (
                <div key={reg.id} className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{reg.employees?.name}</h4>
                      <span className="text-xs text-gray-500">({reg.employees?.department || 'N/A'})</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Date:</span> {reg.date} • <span className="font-medium">Requested Time:</span> {reg.req_in} – {reg.req_out}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div><strong>Reason:</strong> {reg.reason}</div>
                      {reg.remarks && <div><strong>Remarks:</strong> {reg.remarks}</div>}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto">
                    {rejectId === reg.id ? (
                      <div className="flex items-center gap-2 w-full md:w-64">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-red-400"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleRejectReg(reg)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setRejectId(null); setRejectComment(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setRejectId(reg.id)}
                          disabled={isLoading}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveReg(reg)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
