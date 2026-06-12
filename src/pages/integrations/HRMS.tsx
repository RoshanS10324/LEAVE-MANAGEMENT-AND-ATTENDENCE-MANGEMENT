import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Building2, UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, Lock, Trash2, Download, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageContainer, PageHeader } from "@/components/lams/page";
import BRDTag from "@/components/BRDTag";

function timeAgo(date: string | null) {
  if (!date) return 'Never synced';
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

export default function HRMS() {
  const { employee: currentEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [config, setConfig] = useState<any>({ is_active: false, provider: 'Custom CSV', api_endpoint: '', api_key_hint: '', webhook_secret: '', field_mappings: {} });
  const [stats, setStats] = useState({ total: 0, synced: 0, lastSyncAt: null, lastSyncStatus: null });
  const [lastSync, setLastSync] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Config
      const { data: confData, error: confError } = await supabase.from('hrms_config').select('*').limit(1).maybeSingle();
      if (confData) setConfig(confData);
      if (confError) console.error("Config fetch error:", confError);

      // Fetch Stats
      const { count: totalEmp } = await supabase.from('employees').select('*', { count: 'exact', head: true });
      const { count: syncedEmp } = await supabase.from('employees').select('*', { count: 'exact', head: true }).not('hrms_synced_at', 'is', null);
      
      // Fetch Last Sync
      const { data: lastLog, error: logErr } = await supabase.from('hrms_sync_logs').select('*').order('synced_at', { ascending: false }).limit(1).maybeSingle();
      
      setStats({
        total: totalEmp || 0,
        synced: syncedEmp || 0,
        lastSyncAt: lastLog?.synced_at || null,
        lastSyncStatus: lastLog?.status || null
      });
      setLastSync(lastLog || null);

      // Fetch History - removing foreign key query to avoid crashes if relation is missing
      const { data: history, error: histErr } = await supabase.from('hrms_sync_logs').select('*').order('synced_at', { ascending: false });
      if (history) setSyncHistory(history);
      if (histErr) console.error("History fetch error:", histErr);
    } catch (e) {
      console.error("Fetch Data failed:", e);
    }
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // --- TAB 2: CSV IMPORT STATE ---
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [importState, setImportState] = useState('idle'); // idle, preview, importing, complete
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['name','email','role','department','designation','manager_email','shift_name','hrms_id','employment_status'];
    const rows = [
      ['John Smith','john@company.com','employee','Engineering','Developer','manager@company.com','General','EMP001','active'],
      ['Jane Doe','jane@company.com','manager','HR','HR Manager','','General','EMP002','active']
    ];
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leaveflow_hrms_template.csv';
    a.click();
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim());
    return lines.slice(1).map((line: string) => {
      const values = line.split(',').map((v: string) => v.trim());
      return headers.reduce((obj: any, h: string, i: number) => {
        obj[h] = values[i] || '';
        return obj;
      }, {});
    }).filter((row: any) => row.email);
  };

  const handleFileUpload = async (e: any) => {
    const uploadedFile = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      const parsed = parseCSV(text);
      
      const { data: existingEmps } = await supabase.from('employees').select('id, email');
      const emailSet = new Set(existingEmps?.map(e => e.email) || []);

      const rowsWithStatus = parsed.map((row: any) => {
        let status = 'Skip';
        let reason = '';
        if (!row.name) { status = 'Skip'; reason = 'Missing name'; }
        else if (!row.email || !row.email.includes('@')) { status = 'Skip'; reason = 'Invalid email'; }
        else if (emailSet.has(row.email)) { status = 'Update'; }
        else { status = 'New'; }
        
        return { ...row, __status: status, __reason: reason };
      });
      
      setPreviewRows(rowsWithStatus);
      setImportState('preview');
    };
    reader.readAsText(uploadedFile);
  };

  const startImport = async () => {
    setImportState('importing');
    setImportProgress(0);
    
    let created = 0, updated = 0, skipped = 0, errors = 0;
    const errorDetails = [];
    const validRoles = ['employee', 'manager', 'hr', 'super_admin'];

    const total = previewRows.length;
    for (let i = 0; i < total; i++) {
      const row = previewRows[i];
      setImportProgress(Math.round(((i) / total) * 100));

      if (row.__status === 'Skip') {
        skipped++;
        errorDetails.push({ email: row.email, reason: row.__reason });
        continue;
      }

      const role = validRoles.includes(row.role) ? row.role : 'employee';

      try {
        if (row.__status === 'New') {
          // Insert Employee without auth
          const { data: newEmp, error: insErr } = await supabase.from('employees').insert({
            name: row.name,
            email: row.email,
            role: role,
            department: row.department,
            designation: row.designation,
            hrms_id: row.hrms_id,
            hrms_source: 'csv_import',
            hrms_synced_at: new Date().toISOString(),
            employment_status: row.employment_status || 'active'
          }).select().single();

          if (insErr) throw insErr;

          // Insert leave balances
          const year = new Date().getFullYear();
          const { data: types } = await supabase.from('leave_types').select('id, max_days');
          if (types && newEmp) {
            const balances = types.map(t => ({
              emp_id: newEmp.id,
              leave_type_id: t.id,
              year: year,
              total: t.max_days,
              used: 0
            }));
            await supabase.from('leave_balances').insert(balances);
          }
          created++;
        } else if (row.__status === 'Update') {
          const { error: updErr } = await supabase.from('employees').update({
            name: row.name,
            department: row.department,
            designation: row.designation,
            role: role,
            hrms_id: row.hrms_id,
            hrms_source: 'csv_import',
            hrms_synced_at: new Date().toISOString(),
            employment_status: row.employment_status || 'active'
          }).eq('email', row.email);
          if (updErr) throw updErr;
          updated++;
        }

        if (row.manager_email) {
          const { data: mgr } = await supabase.from('employees').select('id').eq('email', row.manager_email).maybeSingle();
          if (mgr) {
            await supabase.from('employees').update({ manager_id: mgr.id }).eq('email', row.email);
          }
        }
      } catch (err) {
        errors++;
        errorDetails.push({ email: row.email, reason: err?.message || 'Unknown error' });
      }
    }
    
    setImportProgress(100);

    // Save Log
    const finalStatus = errors > 0 ? 'partial' : 'success';
    await supabase.from('hrms_sync_logs').insert({
      sync_type: 'manual',
      source: 'csv',
      total_records: total,
      created_count: created,
      updated_count: updated,
      skipped_count: skipped,
      error_count: errors,
      status: finalStatus,
      error_details: errorDetails,
      synced_by: currentEmployee?.id
    });
    
    if (config.id) {
      await supabase.from('hrms_config').update({ last_sync_at: new Date().toISOString() }).eq('id', config.id);
    }

    setImportResults({ created, updated, skipped, errors });
    setImportState('complete');
    fetchData();
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); handleFileUpload(e); };

  // --- TAB 4: CONFIGURATION STATE ---
  const [settings, setSettings] = useState({ provider: 'Custom CSV', api_endpoint: '', api_key: '' });
  const [mappings, setMappings] = useState({ name: 'name', email: 'email', department: 'department', designation: 'designation', role: 'role', manager_email: 'manager_email' });

  useEffect(() => {
    if (config.provider) setSettings({ provider: config.provider, api_endpoint: config.api_endpoint || '', api_key: '' });
    if (config.field_mappings && typeof config.field_mappings === 'object' && Object.keys(config.field_mappings).length > 0) {
      setMappings({ ...mappings, ...config.field_mappings });
    }
  }, [config]);

  const saveSettings = async () => {
    if (!config.id) return;
    await supabase.from('hrms_config').update({ provider: settings.provider, api_endpoint: settings.api_endpoint }).eq('id', config.id);
    showToast('HRMS settings saved');
    fetchData();
  };
  const saveMappings = async () => {
    if (!config.id) return;
    await supabase.from('hrms_config').update({ field_mappings: mappings }).eq('id', config.id);
    showToast('Field mappings saved');
    fetchData();
  };

  const clearSyncHistory = async () => {
    if (window.confirm("Delete all sync history? This cannot be undone.")) {
      await supabase.from('hrms_sync_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      showToast('History cleared');
      fetchData();
    }
  };

  const resetConfig = async () => {
    if (!config.id) return;
    if (window.confirm("Reset all HRMS settings to default?")) {
      await supabase.from('hrms_config').update({ is_active: false, api_endpoint: null }).eq('id', config.id);
      showToast('Config reset');
      fetchData();
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="HRMS Integration"
        subtitle="Sync employee data from your HR Management System"
        breadcrumbs={[{ label: "Integrations" }, { label: "HRMS" }]}
        badge={<BRDTag label="BRD 4.7: HRMS Integration" />}
      />

      <div className="flex items-center justify-end mb-6 -mt-12">
        <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 ${config.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          <div className={`h-2 w-2 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          {config.is_active ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {['overview', 'csv_import', 'history', 'config'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1">Total Employees</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1">HRMS Synced</div>
              <div className="text-2xl font-bold">{stats.synced}</div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1">Last Sync</div>
              <div className="text-xl font-semibold mt-1">{timeAgo(stats.lastSyncAt)}</div>
            </Card>
            <Card className="p-4 shadow-sm border-gray-200">
              <div className="text-gray-500 mb-1">Sync Status</div>
              <div className="mt-2 flex items-center">
                {stats.lastSyncStatus === 'success' ? <span className="text-green-600 font-medium flex items-center gap-1"><Check className="h-4 w-4"/> Success</span> :
                 stats.lastSyncStatus === 'failed' ? <span className="text-red-600 font-medium flex items-center gap-1"><X className="h-4 w-4"/> Failed</span> :
                 stats.lastSyncStatus === 'partial' ? <span className="text-amber-600 font-medium flex items-center gap-1"><AlertCircle className="h-4 w-4"/> Partial</span> :
                 <span className="text-gray-400">No syncs yet</span>}
              </div>
            </Card>
          </div>

          <Card className="p-6 shadow-sm border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Latest Sync Results</h3>
            {!lastSync ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 mb-4">No syncs performed yet. Use CSV Import or trigger a manual sync.</p>
                <Button onClick={() => setActiveTab('csv_import')} className="bg-[#185FA5]">+ Import Employees</Button>
              </div>
            ) : (
              <div>
                <div className="flex gap-6 mb-4">
                  <div className="text-green-600"><span className="font-bold">{lastSync.created_count}</span> new employees</div>
                  <div className="text-blue-600"><span className="font-bold">{lastSync.updated_count}</span> existing</div>
                  <div className="text-gray-500"><span className="font-bold">{lastSync.skipped_count}</span> no changes</div>
                  {lastSync.error_count > 0 && <div className="text-red-600"><span className="font-bold">{lastSync.error_count}</span> failed</div>}
                </div>
                <button onClick={() => setActiveTab('history')} className="text-blue-600 hover:underline">View Full History →</button>
              </div>
            )}
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-4">Supported Integrations</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-5 shadow-sm border-gray-200 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-lg">B</div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium uppercase tracking-wider">Coming Soon</span>
                </div>
                <h4 className="font-semibold text-base">BambooHR</h4>
                <p className="text-gray-500 mb-6">Connect via API key</p>
                <Button disabled variant="outline" className="mt-auto">Configure</Button>
              </Card>
              <Card className="p-5 shadow-sm border-gray-200 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">W</div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium uppercase tracking-wider">Coming Soon</span>
                </div>
                <h4 className="font-semibold text-base">Workday</h4>
                <p className="text-gray-500 mb-6">Connect via SFTP or API</p>
                <Button disabled variant="outline" className="mt-auto">Configure</Button>
              </Card>
              <Card className="p-5 shadow-sm border-gray-200 flex flex-col border-blue-200 bg-blue-50/30">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center"><UploadCloud className="h-5 w-5" /></div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium uppercase tracking-wider">Available</span>
                </div>
                <h4 className="font-semibold text-base">Custom / CSV Import</h4>
                <p className="text-gray-500 mb-6">Upload employee data manually</p>
                <Button onClick={() => setActiveTab('csv_import')} className="bg-[#185FA5] mt-auto">Import Now</Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'csv_import' && (
        <div className="space-y-6">
          {importState === 'idle' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-900">Download Template</h4>
                  <p className="text-blue-700">Download the CSV template, fill in employee data, and upload to sync with LeaveFlow.</p>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="bg-white"><Download className="h-4 w-4 mr-2"/> Download CSV Template</Button>
              </div>

              <div 
                onDragOver={handleDragOver} 
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
                <p className="font-medium text-gray-700">Drag & Drop CSV file here</p>
                <p className="text-gray-500 mb-3">or click to browse</p>
                <Input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </div>
            </>
          )}

          {importState === 'preview' && (
            <Card className="p-0 shadow-sm border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-semibold text-base">Preview Data ({file?.name})</h3>
                  <p className="text-gray-500">
                    {previewRows.filter(r => r.__status === 'New').length} new · {previewRows.filter(r => r.__status === 'Update').length} updates · {previewRows.filter(r => r.__status === 'Skip').length} will be skipped
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImportState('idle')}>Cancel</Button>
                  <Button className="bg-[#185FA5]" onClick={startImport} disabled={!previewRows.some(r => r.__status !== 'Skip')}>Start Import</Button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-medium text-gray-500">Status</th>
                      <th className="p-3 font-medium text-gray-500">Name</th>
                      <th className="p-3 font-medium text-gray-500">Email</th>
                      <th className="p-3 font-medium text-gray-500">Role</th>
                      <th className="p-3 font-medium text-gray-500">Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className={row.__status === 'Skip' ? 'bg-red-50/50 opacity-60' : ''}>
                        <td className="p-3">
                          {row.__status === 'New' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">New</span>}
                          {row.__status === 'Update' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">Update</span>}
                          {row.__status === 'Skip' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold" title={row.__reason}>Skip: {row.__reason}</span>}
                        </td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3">{row.email}</td>
                        <td className="p-3">{row.role}</td>
                        <td className="p-3">{row.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {importState === 'importing' && (
            <Card className="p-8 shadow-sm border-gray-200 text-center">
              <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Importing Data...</h3>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2.5 mb-2">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
              </div>
              <p className="text-gray-500">Processing row {Math.round((importProgress/100) * previewRows.length)} of {previewRows.length}</p>
            </Card>
          )}

          {importState === 'complete' && importResults && (
            <Card className="p-8 shadow-sm border-gray-200 text-center max-w-2xl mx-auto">
              {importResults.errors === 0 ? (
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8"/></div>
              ) : (
                <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="h-8 w-8"/></div>
              )}
              <h2 className="text-2xl font-bold mb-6">Import Complete</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-2xl font-bold text-green-600">{importResults.created}</div>
                  <div className="text-gray-500">New added</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                  <div className="text-gray-500">Updated</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-2xl font-bold text-gray-600">{importResults.skipped}</div>
                  <div className="text-gray-500">Skipped</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                  <div className="text-gray-500">Failed</div>
                </div>
              </div>

              {importResults.created > 0 && (
                <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-xl mb-8 text-left text-sm flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">New employees have been added but cannot login yet.</p>
                    <p>Go to the Employees page to send login invitations or set their initial passwords.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => { setFile(null); setImportState('idle'); }}>Import Again</Button>
                <Button className="bg-[#185FA5]" onClick={() => window.location.href = '/employees'}>View Employees →</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="p-0 shadow-sm border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold">Sync History</h3>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2"/> Export</Button>
          </div>
          {syncHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No sync history yet. Import employees to get started.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="p-4 font-medium text-gray-500">Date/Time</th>
                  <th className="p-4 font-medium text-gray-500">Type</th>
                  <th className="p-4 font-medium text-gray-500">Total</th>
                  <th className="p-4 font-medium text-gray-500">Created</th>
                  <th className="p-4 font-medium text-gray-500">Updated</th>
                  <th className="p-4 font-medium text-gray-500">Skipped</th>
                  <th className="p-4 font-medium text-gray-500">Errors</th>
                  <th className="p-4 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-4">{new Date(log.synced_at).toLocaleString()}</td>
                    <td className="p-4 capitalize">{log.source} {log.sync_type}</td>
                    <td className="p-4 font-medium">{log.total_records}</td>
                    <td className="p-4 text-green-600">{log.created_count}</td>
                    <td className="p-4 text-blue-600">{log.updated_count}</td>
                    <td className="p-4 text-gray-500">{log.skipped_count}</td>
                    <td className={`p-4 ${log.error_count > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{log.error_count}</td>
                    <td className="p-4">
                      {log.status === 'success' && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Success</span>}
                      {log.status === 'partial' && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Partial</span>}
                      {log.status === 'failed' && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'config' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="p-6 shadow-sm border-gray-200">
              <h3 className="text-lg font-semibold mb-4">HRMS Connection Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">Provider</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                    value={settings.provider || 'Custom CSV'}
                    onChange={(e) => setSettings({...settings, provider: e.target.value})}
                  >
                    <option value="Custom CSV">Custom CSV</option>
                    <option value="BambooHR" disabled>BambooHR (Coming Soon)</option>
                    <option value="Workday" disabled>Workday (Coming Soon)</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block">API Endpoint</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input disabled placeholder="Available when provider supports API" className="pl-9 bg-gray-50 text-gray-500" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">API Key</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="password" disabled placeholder="••••••••••••••••" className="pl-9 bg-gray-50 text-gray-500" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Webhook Secret</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={config.webhook_secret || 'whsec_...'} className="bg-gray-50 text-gray-600 font-mono" />
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(config.webhook_secret); showToast('Copied'); }}>Copy</Button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Share this secret with your HRMS provider to authenticate webhook calls to LeaveFlow.</p>
                </div>
                <Button className="bg-[#185FA5] mt-2" onClick={saveSettings}>Save Settings</Button>
              </div>
            </Card>

            <Card className="p-6 shadow-sm border-red-200 border">
              <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={clearSyncHistory}>Clear Sync History</Button>
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={resetConfig}>Reset HRMS Config</Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-sm border-gray-200">
              <h3 className="text-lg font-semibold mb-1">Field Mapping</h3>
              <p className="text-gray-500 mb-4">Map your HRMS fields to LeaveFlow fields</p>
              
              <div className="space-y-3">
                {Object.entries(mappings).map(([lfField, hrmsField]) => (
                  <div key={lfField} className="flex items-center gap-4">
                    <div className="w-1/3 text-gray-700 font-medium capitalize">{lfField.replace('_', ' ')}</div>
                    <Input 
                      className="w-2/3" 
                      value={hrmsField || ''} 
                      onChange={(e) => setMappings({...mappings, [lfField]: e.target.value})}
                    />
                  </div>
                ))}
                <Button className="bg-[#185FA5] mt-4" onClick={saveMappings}>Save Mappings</Button>
              </div>
            </Card>

            <Card className="p-6 shadow-sm border-gray-200 bg-amber-50 border-amber-200">
              <h3 className="text-lg font-semibold text-amber-800 mb-3">Webhook Setup Info</h3>
              <div className="space-y-4 text-amber-900">
                <div>
                  <strong>Step 1: Copy your Webhook URL:</strong>
                  <Input readOnly value="https://gjhcqsfgztccmedonsyx.supabase.co/functions/v1/hrms-webhook" className="bg-white/50 border-amber-200 mt-1" />
                </div>
                <div><strong>Step 2: Copy your Webhook Secret (shown left)</strong></div>
                <div>
                  <strong>Step 3: Configure events:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 opacity-80">
                    <li>employee.created</li>
                    <li>employee.updated</li>
                    <li>employee.terminated</li>
                  </ul>
                </div>
                <div className="p-3 bg-amber-100 rounded text-amber-800 border border-amber-200 mt-2">
                  <strong>Note:</strong> Webhook receiver is configured for production use. During local development, webhooks from external systems cannot reach localhost. Use CSV Import instead.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}
    </PageContainer>
  );
}
