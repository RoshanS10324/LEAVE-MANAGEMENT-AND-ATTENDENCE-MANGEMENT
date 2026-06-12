import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { emailLeaveApplied } from '../../utils/emailService';

export default function ApplyLeave() {
  const { employee } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dayType, setDayType] = useState('Full day');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (employee?.id) {
      fetchBalances();
    }
  }, [employee]);

  const fetchBalances = async () => {
    const year = new Date().getFullYear();
    const { data: balancesData } = await supabase
      .from('leave_balances')
      .select('*, leave_types(name)')
      .eq('emp_id', employee.id)
      .eq('year', year);

    if (balancesData) {
      setLeaveBalances(balancesData);
      setLeaveTypes(balancesData.map((b) => ({ id: b.leave_type_id, name: b.leave_types?.name })));
    }
  };

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const calculateDays = (start, end, half) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e < s) return 0;
    let days = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) days++;
    }
    return half ? days - 0.5 : days;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeaveType || !fromDate || !toDate || !reason) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    const days = calculateDays(fromDate, toDate, dayType !== 'Full day');
    if (days <= 0) {
      showToast('Invalid date range.', 'error');
      return;
    }

    const balance = leaveBalances.find((b) => b.leave_type_id === selectedLeaveType);
    if (!balance) {
      showToast('Leave balance not found.', 'error');
      return;
    }

    const remaining = balance.total - balance.used;
    if (days > remaining) {
      showToast(`Insufficient balance. You have ${remaining} days remaining.`, 'error');
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

      const { error: insertError } = await supabase.from('leave_applications').insert({
        emp_id: employee.id,
        leave_type_id: selectedLeaveType,
        from_date: fromDate,
        to_date: toDate,
        days,
        half_day: dayType !== 'Full day',
        reason,
        status: 'Pending',
        manager_id,
        balance_updated: false
      });

      if (insertError) throw insertError;

      if (manager_id) {
        const leaveTypeName = leaveTypes.find((t) => t.id === selectedLeaveType)?.name || 'Leave';
        await supabase.from('notifications').insert({
          user_id: manager_id,
          message: `${employee.name || 'An employee'} has applied for ${leaveTypeName} leave from ${fromDate} to ${toDate} (${days} day(s)). Action required.`,
        });

        const { data: managerData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', manager_id)
          .single();

        if (managerData) {
          emailLeaveApplied(
            { leave_type_name: leaveTypeName, from_date: fromDate, to_date: toDate, days, reason },
            employee,
            managerData
          ).catch((err) => console.error('Email failed:', err));
        }
      }

      await supabase.from('audit_log').insert({
        action: 'LEAVE_APPLIED',
        entity: 'leave_applications',
        new_value: { days, leave_type: selectedLeaveType, from_date: fromDate, to_date: toDate, status: 'Pending' }
      });

      showToast('Leave application submitted. Awaiting manager approval.', 'success');

      setFromDate('');
      setToDate('');
      setReason('');
      setSelectedLeaveType('');
      setDayType('Full day');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error submitting application', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
  const labelClasses = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apply Leave</h1>
        <p className="text-sm text-slate-500 mt-1">Submit a new leave request for approval</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClasses}>Leave Type</label>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select a leave type...</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className={labelClasses}>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Day Type</label>
            <div className="flex gap-3">
              {['Full day', 'First half', 'Second half'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayType(d)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    dayType === d 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-indigo-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClasses}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className={`${inputClasses} resize-none`}
              placeholder="Add a brief reason..."
            ></textarea>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 h-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-base shadow-sm transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </div>
        </form>
      </div>

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
