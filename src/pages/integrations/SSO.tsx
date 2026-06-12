import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Key, Shield, Info, Download, Check, X, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageContainer, PageHeader } from "@/components/lams/page";
import BRDTag from "@/components/BRDTag";

function timeAgo(date) {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
}

export default function SSO() {
  const [activeTab, setActiveTab] = useState('overview');
  const [configs, setConfigs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch configs
    const { data: cData } = await supabase.from('sso_config').select('*');
    if (cData) setConfigs(cData);

    // Fetch logs
    const { data: lData } = await supabase
      .from('sso_login_logs')
      .select('*, employees(name)')
      .order('logged_at', { ascending: false });
    if (lData) setLogs(lData);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateConfig = async (provider, updates) => {
    const { error } = await supabase.from('sso_config').update(updates).eq('provider', provider);
    if (!error) {
      showToast(`${provider} settings updated`);
      fetchData();
    } else {
      showToast('Error updating settings');
    }
  };

  const testConnection = async (provider) => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: provider === 'google' ? 'google' : 'azure',
        options: { redirectTo: window.location.origin + '/auth/callback' }
      });
    } catch (e) {
      showToast('Connection test failed');
    }
  };

  const googleConfig = configs.find(c => c.provider === 'google') || {};
  const msConfig = configs.find(c => c.provider === 'azure') || {};
  
  const totalLogins = configs.reduce((sum, c) => sum + (c.total_sso_logins || 0), 0);
  const lastLoginDates = configs.map(c => c.last_login_at).filter(Boolean);
  const lastLogin = lastLoginDates.length > 0 ? new Date(Math.max(...lastLoginDates.map(d => new Date(d).getTime()))) : null;

  return (
    <PageContainer>
      <PageHeader
        title="SSO Integration"
        subtitle="Corporate single sign-on for your organization"
        breadcrumbs={[{ label: "Integrations" }, { label: "SSO" }]}
        badge={<BRDTag label="BRD 4.7: SSO Integration" />}
      />

      <div className="flex border-b border-gray-200 mb-6">
        {['overview', 'login_logs', 'configuration'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-indigo-600 text-white rounded-xl p-6 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">SSO / Active Directory</h2>
                <p className="text-indigo-100">Corporate single sign-on for your organization</p>
              </div>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${googleConfig.is_enabled || msConfig.is_enabled ? 'bg-green-500 text-white' : 'bg-white/20 text-indigo-100'}`}>
              {googleConfig.is_enabled || msConfig.is_enabled ? <Check className="h-4 w-4"/> : null}
              {googleConfig.is_enabled || msConfig.is_enabled ? 'Configured' : 'Not Configured'}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1 text-sm font-medium">Google SSO</div>
              <div className={`text-lg font-bold ${googleConfig.is_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {googleConfig.is_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1 text-sm font-medium">Microsoft AD</div>
              <div className={`text-lg font-bold ${msConfig.is_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {msConfig.is_enabled ? 'Enabled' : 'Disabled'}
              </div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1 text-sm font-medium">Total SSO Logins</div>
              <div className="text-2xl font-bold">{totalLogins}</div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1 text-sm font-medium">Last SSO Login</div>
              <div className="text-xl font-semibold mt-1">{timeAgo(lastLogin)}</div>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-slate-800">How it works</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">1</div>
                <h4 className="font-bold text-slate-800 mb-2 mt-1">User Initiates</h4>
                <p className="text-sm text-slate-600">User clicks "Continue with Google/Microsoft" on the LeaveFlow login page.</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">2</div>
                <h4 className="font-bold text-slate-800 mb-2 mt-1">Authentication</h4>
                <p className="text-sm text-slate-600">User securely authenticates with their corporate account provider directly.</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">3</div>
                <h4 className="font-bold text-slate-800 mb-2 mt-1">Automatic Login</h4>
                <p className="text-sm text-slate-600">LeaveFlow matches the verified email to an employee record and logs them in.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6 border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center border">
                    <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </div>
                  <h3 className="font-bold text-lg">Google Workspace</h3>
                </div>
                {googleConfig.is_enabled ? 
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Active</span> : 
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-md">Inactive</span>
                }
              </div>
              <p className="text-slate-500 text-sm mb-6 flex-1">Allow your team to sign in securely using their corporate Google Workspace accounts.</p>
              <Button onClick={() => setActiveTab('configuration')} variant="outline" className="w-full">Configure Settings</Button>
            </Card>

            <Card className="p-6 border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center border">
                    <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                  </div>
                  <h3 className="font-bold text-lg">Microsoft Azure AD</h3>
                </div>
                {msConfig.is_enabled ? 
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Active</span> : 
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-md">Inactive</span>
                }
              </div>
              <p className="text-slate-500 text-sm mb-6 flex-1">Enable secure authentication using Microsoft Azure Active Directory credentials.</p>
              <Button onClick={() => setActiveTab('configuration')} variant="outline" className="w-full">Configure Settings</Button>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4 text-blue-900">
            <Info className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h4 className="font-bold text-blue-800 mb-1">To enable Google SSO:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-800/80">
                <li>Go to Supabase Dashboard → Authentication → Providers</li>
                <li>Enable the Google provider</li>
                <li>Add your Client ID and Secret from the Google Cloud Console</li>
                <li>Set your Redirect URL to: <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-xs">{window.location.origin}/auth/callback</code></li>
                <li>Toggle Google SSO enabled in the Configuration tab above</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'login_logs' && (
        <Card className="p-0 shadow-sm border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-slate-800">Login Logs</h3>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/> Export CSV</Button>
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No SSO login activity recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-gray-200 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Date/Time</th>
                    <th className="p-4 font-medium">Employee</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Provider</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-slate-600">{new Date(log.logged_at).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-900">{log.employees?.name || 'Unknown'}</td>
                      <td className="p-4 text-slate-600">{log.email}</td>
                      <td className="p-4 capitalize text-slate-700 font-medium flex items-center gap-2">
                        {log.provider === 'google' ? <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> : null}
                        {log.provider === 'azure' ? <svg width="14" height="14" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> : null}
                        {log.provider}
                      </td>
                      <td className="p-4">
                        {log.status === 'success' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Success</span>}
                        {log.status === 'failed' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Failed</span>}
                        {log.status === 'provisioned' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Auto-provisioned</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'configuration' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="p-6 border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <h3 className="font-bold text-lg">Google Workspace SSO</h3>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800">Enable Google SSO</div>
                  <div className="text-sm text-slate-500">Allow users to log in with Google</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={googleConfig.is_enabled || false} onChange={(e) => updateConfig('google', { is_enabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <Input readOnly placeholder="Configure in Supabase Dashboard" className="bg-slate-50" />
                <p className="text-xs text-slate-500 mt-1">Set in Supabase → Authentication → Providers → Google</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Domain Restriction</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="company.com (leave empty to allow all)" 
                    defaultValue={googleConfig.domain_restriction || ''}
                    onBlur={(e) => updateConfig('google', { domain_restriction: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Auto-provision new users</div>
                  <div className="text-xs text-slate-500">Create employee records automatically if they don't exist</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={googleConfig.auto_provision || false} onChange={(e) => updateConfig('google', { auto_provision: e.target.checked })} />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <Button onClick={() => testConnection('google')} variant="outline" className="w-full">
                <LogIn className="w-4 h-4 mr-2"/> Test Google Connection
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
              <h3 className="font-bold text-lg">Microsoft Azure AD</h3>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800">Enable Microsoft SSO</div>
                  <div className="text-sm text-slate-500">Allow users to log in with Azure AD</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={msConfig.is_enabled || false} onChange={(e) => updateConfig('azure', { is_enabled: e.target.checked })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tenant ID</label>
                <Input 
                  placeholder="your-tenant-id.onmicrosoft.com" 
                  defaultValue={msConfig.tenant_id || ''}
                  onBlur={(e) => updateConfig('azure', { tenant_id: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Auto-provision new users</div>
                  <div className="text-xs text-slate-500">Create employee records automatically if they don't exist</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={msConfig.auto_provision || false} onChange={(e) => updateConfig('azure', { auto_provision: e.target.checked })} />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <Button onClick={() => testConnection('azure')} variant="outline" className="w-full">
                <LogIn className="w-4 h-4 mr-2"/> Test Microsoft Connection
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-slate-700"/> Security Settings</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Session Timeout (Hours)</label>
                <Input type="number" defaultValue="24" className="w-32" />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Require MFA for SSO Login</div>
                  <div className="text-xs text-slate-500 font-bold text-indigo-500 mt-0.5">COMING SOON</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer opacity-50">
                  <input type="checkbox" className="sr-only peer" disabled />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Allow Password Login Alongside SSO</div>
                  <div className="text-xs text-slate-500">If disabled, users MUST use SSO to log in</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <Button className="bg-indigo-600 w-full">Save Security Settings</Button>
            </div>
          </Card>

          <div className="border rounded-xl overflow-hidden bg-white">
            <button 
              onClick={() => setGuideOpen(!guideOpen)} 
              className="w-full p-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="font-bold text-slate-800">Supabase Setup Guide</span>
              {guideOpen ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
            </button>
            {guideOpen && (
              <div className="p-6 border-t space-y-6 text-sm text-slate-700">
                <div>
                  <h4 className="font-bold text-lg mb-2">Google Cloud Console Steps</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to <a href="https://console.cloud.google.com" className="text-indigo-600 hover:underline">Google Cloud Console</a>.</li>
                    <li>Create a new project or select an existing one.</li>
                    <li>Go to <strong>APIs & Services {'>'} Credentials</strong>.</li>
                    <li>Click <strong>Create Credentials {'>'} OAuth client ID</strong>.</li>
                    <li>Choose <strong>Web application</strong>.</li>
                    <li>Add your Supabase project URL to Authorized JavaScript origins.</li>
                    <li>Add <code>https://&lt;project-ref&gt;.supabase.co/auth/v1/callback</code> to Authorized redirect URIs.</li>
                    <li>Copy the generated Client ID and Client Secret.</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Supabase Dashboard Configuration</h4>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to your Supabase project dashboard.</li>
                    <li>Navigate to <strong>Authentication {'>'} Providers</strong>.</li>
                    <li>Select <strong>Google</strong> (or Azure) and enable it.</li>
                    <li>Paste the Client ID and Client Secret you obtained earlier.</li>
                    <li>Save the changes.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded shadow-lg text-sm font-medium bg-gray-900 text-white animate-in fade-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </PageContainer>
  );
}
