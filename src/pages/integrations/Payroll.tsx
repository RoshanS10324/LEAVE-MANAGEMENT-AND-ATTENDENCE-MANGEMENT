import { useState, useEffect } from "react";
import { PageContainer, PageHeader, StatTile, DataTable, StatusPill } from "@/components/lams/page";
import BRDTag from "@/components/BRDTag";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  ArrowRight, 
  Download, 
  UploadCloud, 
  Settings, 
  History, 
  Calendar,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Lock
} from "lucide-react";

export default function Payroll() {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState<string | null>(null);
  
  // Mock Stats
  const [stats] = useState({
    lastSync: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'success',
    totalProcessed: 142
  });

  // Mock History
  const [history] = useState([
    { id: '1', date: new Date().toISOString(), type: 'Monthly Export', records: 142, status: 'Success', by: 'System Admin' },
    { id: '2', date: new Date(Date.now() - 86400000 * 30).toISOString(), type: 'Monthly Export', records: 140, status: 'Success', by: 'HR Manager' },
    { id: '3', date: new Date(Date.now() - 86400000 * 32).toISOString(), type: 'Manual Sync', records: 5, status: 'Failed', by: 'System Admin' }
  ]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  const handleExport = () => {
    showToast("Generating payroll export...");
    setTimeout(() => showToast("Payroll extract downloaded successfully."), 1500);
  };

  const handleSync = () => {
    showToast("Initiating API sync with Gusto...");
    setTimeout(() => showToast("Sync completed. 142 records pushed."), 2000);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Payroll Integration"
        subtitle="Push attendance and leave data to your external payroll system"
        breadcrumbs={[{ label: "Integrations" }, { label: "Payroll" }]}
        badge={<BRDTag label="BRD 4.7: Payroll Integration" />}
      />

      <div className="flex border-b border-border mb-6">
        {['overview', 'export_sync', 'history', 'config'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.replace('_', ' & ')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile 
              label="Last Payroll Sync" 
              value="2 days ago" 
              icon={Calendar} 
              tone="primary" 
            />
            <StatTile 
              label="Last Sync Status" 
              value="Success" 
              icon={Check} 
              tone="success" 
            />
            <StatTile 
              label="Records Processed" 
              value="142" 
              icon={DollarSign} 
              tone="teal" 
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Supported Payroll Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 bg-surface border-border/60 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">G</div>
                  <span className="px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-semibold uppercase tracking-wider">Connected</span>
                </div>
                <h4 className="font-semibold text-base">Gusto</h4>
                <p className="text-sm text-muted-foreground mb-6">Automated API integration</p>
                <Button variant="outline" className="mt-auto" onClick={() => setActiveTab('config')}>Configure</Button>
              </Card>
              
              <Card className="p-5 bg-surface border-border/60 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">A</div>
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground border border-border rounded-full text-[10px] font-semibold uppercase tracking-wider">Inactive</span>
                </div>
                <h4 className="font-semibold text-base">ADP Workforce</h4>
                <p className="text-sm text-muted-foreground mb-6">SFTP automated drops</p>
                <Button variant="outline" className="mt-auto" onClick={() => showToast("ADP Integration requires Enterprise License")}>Setup</Button>
              </Card>

              <Card className="p-5 bg-surface border-primary/20 bg-primary/5 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center"><FileSpreadsheet className="h-5 w-5" /></div>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-semibold uppercase tracking-wider">Default</span>
                </div>
                <h4 className="font-semibold text-base">Custom / CSV Export</h4>
                <p className="text-sm text-muted-foreground mb-6">Download payroll-ready data</p>
                <Button className="mt-auto" onClick={() => setActiveTab('export_sync')}>Export Data</Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export_sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-surface border-border/60">
            <h3 className="text-lg font-semibold mb-2">Automated API Sync</h3>
            <p className="text-sm text-muted-foreground mb-6">Push the latest attendance and leave data directly to your connected payroll provider (Gusto).</p>
            
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Payroll Cycle</Label>
                <select className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm">
                  <option>Current Month (June 2026)</option>
                  <option>Previous Month (May 2026)</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <Button onClick={handleSync} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <UploadCloud className="h-4 w-4" /> Push to Gusto
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-surface border-border/60">
            <h3 className="text-lg font-semibold mb-2">Manual CSV Export</h3>
            <p className="text-sm text-muted-foreground mb-6">Download a structured CSV file containing consolidated payroll data.</p>
            
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Export Format</Label>
                <select className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm">
                  <option>Standard LeaveFlow Format</option>
                  <option>RazorpayX Compatible</option>
                  <option>Tally ERP 9 Compatible</option>
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block text-sm font-medium">Data Points to Include</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded border-border text-primary" /> Total Working Days
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded border-border text-primary" /> Approved Leaves & LOP
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded border-border text-primary" /> Overtime Hours
                  </label>
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={handleExport} variant="outline" className="w-full gap-2">
                  <Download className="h-4 w-4" /> Generate CSV Extract
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="p-0 bg-surface border-border/60 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-surface-muted/40">
            <h3 className="font-semibold">Integration History</h3>
            <Button variant="outline" size="sm" className="h-8"><Download className="h-3.5 w-3.5 mr-1.5"/> Export Log</Button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">Date & Time</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">Action Type</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">Records</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground uppercase text-[11px] tracking-wider">Initiated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3">{new Date(h.date).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{h.type}</td>
                  <td className="px-4 py-3">{h.records}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={h.status as any} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{h.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'config' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-surface border-border/60">
            <h3 className="text-lg font-semibold mb-4">Provider Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm">Active Provider</Label>
                <select className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm">
                  <option>Gusto Payroll</option>
                  <option>RazorpayX Payroll</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">API Endpoint URL</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input defaultValue="https://api.gusto.com/v1/companies/c_1234/payrolls" className="pl-9 text-sm font-mono bg-surface-muted" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">API Secret Key</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" defaultValue="sk_live_1234567890" className="pl-9 text-sm font-mono bg-surface-muted" />
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={() => showToast("Configuration saved securely.")}>Save Configuration</Button>
            </div>
          </Card>

          <Card className="p-6 bg-surface border-border/60">
            <h3 className="text-lg font-semibold mb-1">Data Mapping</h3>
            <p className="text-sm text-muted-foreground mb-4">Map LeaveFlow fields to your payroll provider's expected format.</p>
            
            <div className="space-y-3">
              {[
                { lf: 'Base Salary', py: 'base_compensation' },
                { lf: 'Loss of Pay Days', py: 'unpaid_time_off' },
                { lf: 'Overtime Hours', py: 'overtime_hours' },
                { lf: 'Bonus / Commissions', py: 'bonus_amount' }
              ].map((map, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-1/3 text-sm font-medium text-muted-foreground">{map.lf}</div>
                  <Input className="w-2/3 h-9 text-sm font-mono" defaultValue={map.py} />
                </div>
              ))}
              <Button variant="outline" className="mt-4 w-full" onClick={() => showToast("Mappings updated.")}>Update Mappings</Button>
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded shadow-lg text-sm font-medium bg-foreground text-background animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </PageContainer>
  );
}
