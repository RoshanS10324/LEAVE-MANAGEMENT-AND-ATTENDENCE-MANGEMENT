import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import WorkflowStepper from '../../components/WorkflowStepper';
import { ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { emailLeaveCancelled } from '../../utils/emailService';

export default function MyLeaves() {
  const { employee } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (employee?.id) {
      fetchLeaves();
    }
  }, [employee]);

  const fetchLeaves = async () => {
    const { data } = await supabase
      .from('leave_applications')
      .select('*, leave_types(name)')
      .eq('emp_id', employee.id)
      .order('created_at', { ascending: false });

    if (data) setLeaves(data);
  };

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const handleCancel = async (e, leave) => {
    e.stopPropagation();
    if (!employee?.id) return;

    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({ status: 'Cancelled' })
        .eq('id', leave.id);

      if (error) throw error;

      if (leave.manager_id) {
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: leave.manager_id,
          message: `${employee.name} cancelled their leave request for ${leave.from_date} to ${leave.to_date}`
        });
        if (notifErr) console.error("Notif Error:", notifErr);

        const { data: managerData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', leave.manager_id)
          .single();

        if (managerData) {
          emailLeaveCancelled(
            { leave_type_name: leave.leave_types?.name, from_date: leave.from_date, to_date: leave.to_date, days: leave.days },
            employee,
            managerData
          ).catch((err) => console.error('Email failed:', err));
        }
      }

      showToast('Leave application cancelled');
      fetchLeaves();
    } catch (err) {
      console.error(err);
      showToast('Error cancelling leave', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Awaiting Manager</span>;
      case 'Manager_Approved':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Awaiting HR</span>;
      case 'Manager_Rejected':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Rejected by Manager</span>;
      case 'Approved':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Approved</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Rejected</span>;
      case 'Cancelled':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Leaves</h1>
        <p className="text-sm text-gray-500 mt-1">Track the status of your leave applications</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {leaves.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No leave applications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((leave) => {
              const isExpanded = expandedId === leave.id;
              
              return (
                <div key={leave.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div
                    onClick={() => toggleExpand(leave.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm items-center">
                      <div className="font-semibold text-gray-800">
                        {leave.leave_types?.name || 'Leave'}
                      </div>
                      <div className="text-gray-600">
                        {leave.from_date} to {leave.to_date}
                      </div>
                      <div className="text-gray-600 font-medium">
                        {leave.days} Day{leave.days > 1 ? 's' : ''}
                      </div>
                      <div>
                        {getStatusBadge(leave.status)}
                      </div>
                      <div className="flex justify-end pr-4">
                        {leave.status === 'Pending' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => handleCancel(e, leave)}
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reason</h4>
                        <p className="text-sm text-gray-700">{leave.reason}</p>
                      </div>
                      
                      {leave.status !== 'Cancelled' && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workflow Status</h4>
                          <WorkflowStepper type="leave" record={leave} />
                        </div>
                      )}
                      
                      {leave.status === 'Cancelled' && (
                        <p className="text-sm italic text-gray-500 mt-2">This leave application was cancelled.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
