import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import HRApprovals from './pages/hr/HRApprovals';
import HRMS from './pages/integrations/HRMS';
import AuthCallback from './pages/AuthCallback';
import SSO from './pages/integrations/SSO';
import BRDCompliance from './pages/super-admin/BRDCompliance';

// ADD THIS ROUTE TO YOUR App.jsx
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/hr/approvals" element={
          <PrivateRoute roles={['hr','super_admin']}>
            <HRApprovals />
          </PrivateRoute>
        } />
        <Route path="/integrations/hrms" element={
          <PrivateRoute roles={['hr','super_admin']}>
            <HRMS />
          </PrivateRoute>
        } />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/integrations/sso" element={
          <PrivateRoute roles={['hr','super_admin']}>
            <SSO />
          </PrivateRoute>
        } />
        <Route path="/super-admin/compliance" element={
          <PrivateRoute roles={['super_admin','hr']}>
            <BRDCompliance />
          </PrivateRoute>
        } />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
