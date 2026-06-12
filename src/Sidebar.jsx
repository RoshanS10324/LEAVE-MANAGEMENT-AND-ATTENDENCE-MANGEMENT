import React from 'react';
import { NavLink } from 'react-router-dom';

// ADD THIS TO YOUR Sidebar.jsx under HR ADMIN section
export default function Sidebar() {
  // Assume hrApprovalCount is fetched elsewhere
  const hrApprovalCount = 0; 
  
  return (
    <nav>
      {/* existing links */}
      
      <NavLink to="/hr/approvals" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <i className="ti-checks"></i>
        <span>HR Approvals</span>
        {hrApprovalCount > 0 && (
          <span className="ml-auto bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-bold">
            {hrApprovalCount}
          </span>
        )}
      </NavLink>
      
      {/* other links */}
    </nav>
  );
}
