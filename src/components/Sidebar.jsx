import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Sidebar() {
  const [hrmsActive, setHrmsActive] = useState(false);

  useEffect(() => {
    checkHrmsStatus();
  }, []);

  const checkHrmsStatus = async () => {
    try {
      // Check if config is active
      const { data: config } = await supabase.from('hrms_config').select('is_active').single();
      if (config?.is_active) {
        setHrmsActive(true);
        return;
      }
      
      // Check if any logs exist
      const { count } = await supabase.from('hrms_sync_logs').select('*', { count: 'exact', head: true });
      if (count && count > 0) {
        setHrmsActive(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav>
      {/* existing links */}
      
      <div className="pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Integrations</div>
      <NavLink to="/integrations/hrms" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <i className="ti-plug"></i>
        <span>HRMS</span>
        {hrmsActive && (
          <span className="ml-auto flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </NavLink>
      
      <div className="pt-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Super Admin</div>
      <NavLink to="/super-admin/compliance" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100">
        <i className="ti-clipboard-check"></i>
        <span>BRD Compliance</span>
      </NavLink>
      
      {/* other links */}
    </nav>
  );
}
