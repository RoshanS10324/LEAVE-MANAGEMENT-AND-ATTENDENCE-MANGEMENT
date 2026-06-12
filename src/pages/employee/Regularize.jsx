import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import WorkflowStepper from '../../components/WorkflowStepper';
import { Button } from '../../components/ui/button';
import { CalendarDays, ChevronDown, ChevronRight, Send } from 'lucide-react';
import BRDTag from '../../components/BRDTag';
import { emailRegularizationSubmitted } from '../../utils/emailService';

export default function Regularize() {
  const { employee } = useAuth();

  const [selectedDate, setSelectedDate] = useState('');
  const [reqIn, setReqIn] = useState('');
  const [reqOut, setReqOut] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [requests, setRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (employee?.id) {
      fetchRequests();
    }
  }, [employee]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('regularizations')
      .select('*')
      .eq('emp_id', employee.id)
      .order('created_at', { ascending: false });

    if (data) setRequests(data);
  };

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !reqIn || !reqOut || !reason) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    if (reqOut <= reqIn) {
      showToast('Check-out time must be after check-in time.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('manager_id')
        .eq('id', employee.id)
        .single();
        
      const manager_id = empData?.manager_id;

      const { error: insertError } = await supabase.from('regularizations').insert({
        emp_id: employee.id,
        date: selectedDate,
        req_in: reqIn,
        req_out: reqOut,
        reason,
        remarks,
        status: 'Pending',
      });

      if (insertError) throw insertError;

      if (manager_id) {
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: manager_id,
          message: `${employee.name || 'An employee'} submitted an attendance regularization request for ${selectedDate}. Requested time: ${reqIn} - ${reqOut}. Reason: ${reason}. Action required.`
        });
        if (notifErr) console.error("Notif Error:", notifErr);

        const { data: managerData } = await supabase.from('employees').select('*').eq('id', manager_id).single();
        if (managerData) {
          emailRegularizationSubmitted(
            { date: selectedDate, req_in: reqIn, req_out: reqOut, reason },
            employee,
            managerData
          ).catch(err => console.error('Email failed:', err));
        }
      }

      await supabase.from('audit_log').insert({
        action: 'REGULARIZATION_SUBMITTED',
        entity: 'regularizations',
        new_value: { date: selectedDate, req_in: reqIn, req_out: reqOut, reason, status: 'Pending' },
      });

      showToast('Regularization request submitted. Awaiting manager approval.');
      
      setSelectedDate('');
      setReqIn('');
      setReqOut('');
      setReason('');
      setRemarks('');
      
      fetchRequests();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error submitting request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-semibold">Pending Manager</span>;
      case 'Manager_Approved':
        return <span className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold">Pending HR</span>;
      case 'Manager_Rejected':
        return <span className="bg-rose-50 text-rose-700 rounded-full px-3 py-1 text-xs font-semibold">Manager Rejected</span>;
      case 'Approved':
        return <span className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold">Approved</span>;
      case 'Rejected':
        return <span className="bg-rose-50 text-rose-700 rounded-full px-3 py-1 text-xs font-semibold">HR Rejected</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 rounded-full px-3 py-1 text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Regularization</h1>
          <p className="text-sm text-slate-500 mt-1">Submit and track attendance correction requests</p>
        </div>
        <BRDTag label="BRD FR-3: Attendance Regularization" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
        <h3 className="font-bold text-slate-900 tracking-tight mb-5">Submit New Request</h3>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Requested In Time</label>
                <input
                  type="time"
                  value={reqIn}
                  onChange={(e) => setReqIn(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Requested Out Time</label>
                <input
                  type="time"
                  value={reqOut}
                  onChange={(e) => setReqOut(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason Category</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                required
              >
                <option value="">Select a reason...</option>
                <option value="Forgot to Punch In/Out">Forgot to Punch In/Out</option>
                <option value="System/Biometric Error">System/Biometric Error</option>
                <option value="On Duty / Client Visit">On Duty / Client Visit</option>
                <option value="Work from Home">Work from Home</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks (Optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows="2"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                placeholder="Additional details..."
              ></textarea>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl px-5 py-2.5 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 h-fit">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Guidelines</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex gap-3"><span className="text-indigo-600 font-bold mt-0.5">•</span> Corrections are reviewed by your manager and HR</li>
              <li className="flex gap-3"><span className="text-indigo-600 font-bold mt-0.5">•</span> Only submit requests for days where attendance was not properly recorded</li>
              <li className="flex gap-3"><span className="text-indigo-600 font-bold mt-0.5">•</span> Provide valid reasons and exact times for the correction</li>
              <li className="flex gap-3"><span className="text-indigo-600 font-bold mt-0.5">•</span> Approved regularizations will automatically sync with payroll</li>
            </ul>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6 md:p-8">
        <h3 className="font-bold text-slate-900 tracking-tight mb-5">Previous Requests</h3>
        
        {requests.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-sm text-slate-500">No regularization requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => {
              const isExpanded = expandedId === req.id;
              
              return (
                <div key={req.id} className="py-2">
                  <div
                    onClick={() => toggleExpand(req.id)}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:bg-slate-50/70 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm items-center">
                      <div className="font-bold text-slate-900">
                        {new Date(req.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-slate-500 font-medium">
                        {req.req_in} - {req.req_out}
                      </div>
                      <div className="text-slate-600 truncate">
                        {req.reason}
                      </div>
                      <div>
                        {getStatusBadge(req.status)}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mx-4 mt-2 mb-4 px-6 py-5 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="mb-5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Remarks</h4>
                        <p className="text-sm text-slate-700">{req.remarks || 'No additional remarks.'}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Workflow Status</h4>
                        <WorkflowStepper type="regularization" record={req} />
                      </div>
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
