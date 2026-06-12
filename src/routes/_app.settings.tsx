import { createFileRoute } from "@tanstack/react-router";
import { Building2, Bell, Globe, Palette, Lock, Mail, Save, CheckCircle2 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — LAMS" }] }),
  component: SettingsPage,
});

const SECTIONS = [
  { id: "org", label: "Organization", icon: Building2 },
  { id: "notif", label: "Notifications", icon: Bell },
  { id: "locale", label: "Locale & Time", icon: Globe },
  { id: "brand", label: "Branding", icon: Palette },
  { id: "security", label: "Security", icon: Lock },
  { id: "email", label: "Email Templates", icon: Mail },
];

function SettingsPage() {
  const [active, setActive] = useState("org");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Tenant configuration and platform preferences"
        breadcrumbs={[{ label: "Settings" }]}
        actions={
          <Button
            size="sm"
            className={`transition-all ${saved ? "bg-success text-success-foreground" : "bg-gradient-brand text-white"}`}
            onClick={handleSave}
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" /> Save changes
              </>
            )}
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        <Card className="p-2 bg-surface border-border/60 h-fit sticky top-20">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-surface-muted"}`}
              >
                <Icon className="h-4 w-4" /> {s.label}
              </button>
            );
          })}
        </Card>

        <div className="space-y-4">
          {active === "org" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Organization Profile</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tenant-wide settings for your organization
              </p>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input defaultValue="Northwind Logistics" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Tenant ID</Label>
                  <Input defaultValue="northwind" disabled className="mt-1.5 h-11 font-mono" />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input defaultValue="Logistics & Supply Chain" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Headcount</Label>
                  <Input defaultValue="12,840" className="mt-1.5 h-11" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Registered Address</Label>
                  <Input
                    defaultValue="100 Workforce Plaza, Bengaluru, India"
                    className="mt-1.5 h-11"
                  />
                </div>
              </div>
            </Card>
          )}
          {active === "notif" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Notification Preferences</h3>
              <div className="mt-6 divide-y divide-border">
                {[
                  { label: "Email notifications for approval requests", on: true },
                  { label: "Daily attendance digest", on: true },
                  { label: "SMS alerts for urgent escalations", on: false },
                  { label: "Slack notifications for HR events", on: true },
                  { label: "Mobile push notifications", on: true },
                  { label: "Weekly executive summary", on: true },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="py-4 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium">{n.label}</span>
                    <Switch defaultChecked={n.on} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          {active === "locale" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Locale & Time</h3>
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Default Timezone</Label>
                  <Input defaultValue="(GMT+05:30) Asia/Kolkata" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Input defaultValue="DD MMM YYYY" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Time Format</Label>
                  <Input defaultValue="24-hour" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Week Start</Label>
                  <Input defaultValue="Monday" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Language</Label>
                  <Input defaultValue="English (US)" className="mt-1.5 h-11" />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input defaultValue="USD" className="mt-1.5 h-11" />
                </div>
              </div>
            </Card>
          )}
          {active === "brand" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Branding</h3>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-brand grid place-items-center text-white text-2xl font-bold">
                    N
                  </div>
                  <div className="flex-1">
                    <Label>Organization Logo</Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      PNG / SVG · Recommended 512×512
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      Upload
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" />
                  </div>
                </div>
                <div>
                  <Label>Primary Color</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-11 w-11 rounded-lg bg-primary" />
                    <Input defaultValue="#1e40af" className="h-11 font-mono flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-11 w-11 rounded-lg bg-teal" />
                    <Input defaultValue="#14b8a6" className="h-11 font-mono flex-1" />
                  </div>
                </div>
              </div>
            </Card>
          )}
          {active === "security" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Security</h3>
              <div className="mt-6 divide-y divide-border">
                {[
                  { label: "Enforce MFA for all users", on: true },
                  { label: "Session timeout (30 minutes idle)", on: true },
                  { label: "IP allowlist for admin access", on: false },
                  { label: "Audit log webhook to SIEM", on: true },
                ].map((n) => (
                  <div
                    key={n.label}
                    className="py-4 flex items-center justify-between first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium">{n.label}</span>
                    <Switch defaultChecked={n.on} />
                  </div>
                ))}
              </div>
            </Card>
          )}
          {active === "email" && (
            <Card className="p-6 bg-surface border-border/60">
              <h3 className="font-semibold text-lg">Email Templates</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Customize transactional emails sent by LAMS
              </p>
              <div className="mt-6 space-y-2">
                {[
                  "Leave Application",
                  "Leave Approved",
                  "Leave Rejected",
                  "Attendance Reminder",
                  "Escalation Notice",
                  "Welcome Email",
                ].map((t) => (
                  <div
                    key={t}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => alert(`Edit template: ${t}`)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
