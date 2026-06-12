import React from 'react';
import { format } from 'date-fns';

const WorkflowStepper = ({ type, record }) => {
  const { status } = record;

  let steps = [];

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'PPp');
  };

  if (type === 'leave') {
    steps = [
      {
        label: 'Applied',
        done: true,
        approved: true,
        date: record.created_at,
      },
      {
        label: 'Manager Review',
        done: status !== 'Pending',
        approved: ['Manager_Approved', 'Approved'].includes(status),
        rejected: status === 'Manager_Rejected',
        date: record.manager_actioned_at,
        comment: record.manager_comments,
        isCurrent: status === 'Pending',
      },
      {
        label: 'HR Validation',
        done: ['Approved', 'Rejected'].includes(status),
        approved: status === 'Approved',
        rejected: status === 'Rejected',
        date: record.hr_actioned_at,
        comment: record.hr_comments,
        isCurrent: status === 'Manager_Approved',
      },
      {
        label: 'Balance Updated',
        done: record.balance_updated === true,
        approved: record.balance_updated === true,
        isCurrent: status === 'Approved' && !record.balance_updated,
      },
      {
        label: 'Notified',
        done: ['Approved', 'Rejected'].includes(status),
        approved: ['Approved', 'Rejected'].includes(status),
      },
    ];
  } else if (type === 'regularization') {
    steps = [
      {
        label: 'Submitted',
        done: true,
        approved: true,
        date: record.created_at,
      },
      {
        label: 'Manager Review',
        done: status !== 'Pending',
        approved: ['Manager_Approved', 'Approved'].includes(status),
        rejected: status === 'Manager_Rejected',
        date: record.manager_actioned_at,
        comment: record.manager_comments,
        isCurrent: status === 'Pending',
      },
      {
        label: 'HR Review',
        done: ['Approved', 'Rejected'].includes(status),
        approved: status === 'Approved',
        rejected: status === 'Rejected',
        date: record.hr_actioned_at,
        comment: record.hr_comments,
        isCurrent: status === 'Manager_Approved',
      },
      {
        label: 'Attendance Updated',
        done: record.attendance_updated === true,
        approved: record.attendance_updated === true,
        isCurrent: status === 'Approved' && !record.attendance_updated,
      },
      {
        label: 'Payroll Synced',
        done: record.payroll_synced === true,
        approved: record.payroll_synced === true,
        isCurrent: status === 'Approved' && record.attendance_updated && !record.payroll_synced,
      },
    ];
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center w-full mt-4 pb-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const nextStepDone = !isLast && steps[index + 1].done;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-row md:flex-col items-center md:flex-1 relative group mb-4 md:mb-0">
              <div
                className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-white z-10 
                ${
                  step.done && step.approved
                    ? 'bg-green-500'
                    : step.done && step.rejected
                    ? 'bg-red-500'
                    : step.isCurrent
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-200'
                }`}
              >
                {step.done && step.approved && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.done && step.rejected && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {!step.done && step.isCurrent && (
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                )}
              </div>

              <div className="ml-3 md:ml-0 md:mt-2 flex flex-col md:items-center text-left md:text-center">
                <div className="text-xs font-medium text-gray-700 md:whitespace-nowrap">{step.label}</div>
                {step.date && (
                  <div className="text-[11px] text-gray-500 mt-0.5 md:whitespace-nowrap">
                    {formatDate(step.date)}
                  </div>
                )}
              </div>
              
              {step.comment && (
                <div className="hidden md:block absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-20 pointer-events-none">
                  {step.comment}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
              {step.comment && (
                <div className="block md:hidden text-xs text-gray-600 ml-3 italic mt-1">
                  Reason: {step.comment}
                </div>
              )}
            </div>

            {!isLast && (
              <div className="hidden md:block flex-1 h-0.5 mx-2 -mt-6">
                <div
                  className={`h-full ${nextStepDone ? 'bg-green-500' : 'bg-gray-200'}`}
                  style={{ width: '100%' }}
                ></div>
              </div>
            )}
            
            {!isLast && (
               <div className="block md:hidden w-0.5 h-8 ml-4 my-1">
                 <div
                   className={`w-full h-full ${nextStepDone ? 'bg-green-500' : 'bg-gray-200'}`}
                 ></div>
               </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WorkflowStepper;
