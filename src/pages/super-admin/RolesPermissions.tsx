import { Check, Minus } from "lucide-react";

const FEATURES = [
  "Apply Leave",
  "View Own Leaves",
  "Cancel Leave",
  "View Team Leaves",
  "Approve/Reject Leaves",
  "View All Leaves (org)",
  "Configure Leave Policy",
  "View Own Attendance",
  "Mark WFH",
  "Regularize Attendance",
  "View Team Attendance",
  "View All Attendance",
  "Configure Shifts",
  "Manage Holidays",
  "View Reports (own)",
  "View Reports (team)",
  "View Reports (org)",
  "Manage Employees",
  "Change Roles",
  "View Audit Logs",
  "Manage Integrations",
  "System Settings",
  "User Management",
];

const ROLES = ["employee", "manager", "hr", "super_admin"] as const;

// Permission matrix: which roles can do what
const PERMISSIONS: Record<string, (typeof ROLES)[number][]> = {
  "Apply Leave": ["employee", "manager", "hr", "super_admin"],
  "View Own Leaves": ["employee", "manager", "hr", "super_admin"],
  "Cancel Leave": ["employee", "manager", "hr", "super_admin"],
  "View Team Leaves": ["manager", "hr", "super_admin"],
  "Approve/Reject Leaves": ["manager", "hr", "super_admin"],
  "View All Leaves (org)": ["hr", "super_admin"],
  "Configure Leave Policy": ["hr", "super_admin"],
  "View Own Attendance": ["employee", "manager", "hr", "super_admin"],
  "Mark WFH": ["employee", "manager", "hr", "super_admin"],
  "Regularize Attendance": ["employee", "manager", "hr", "super_admin"],
  "View Team Attendance": ["manager", "hr", "super_admin"],
  "View All Attendance": ["hr", "super_admin"],
  "Configure Shifts": ["hr", "super_admin"],
  "Manage Holidays": ["hr", "super_admin"],
  "View Reports (own)": ["employee", "manager", "hr", "super_admin"],
  "View Reports (team)": ["manager", "hr", "super_admin"],
  "View Reports (org)": ["hr", "super_admin"],
  "Manage Employees": ["hr", "super_admin"],
  "Change Roles": ["super_admin"],
  "View Audit Logs": ["hr", "super_admin"],
  "Manage Integrations": ["hr", "super_admin"],
  "System Settings": ["super_admin"],
  "User Management": ["super_admin"],
};

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR",
  super_admin: "Super Admin",
};

export default function RolesPermissions() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-defined role permissions matrix
        </p>
      </div>

      <div className="bg-surface border border-border/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                  Feature / Module
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[100px]"
                  >
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr
                  key={f}
                  className={`border-b border-border last:border-0 hover:bg-surface-muted/40 transition-colors ${
                    i % 2 === 0 ? "bg-surface" : "bg-surface-muted/20"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium">{f}</td>
                  {ROLES.map((r) => {
                    const allowed = PERMISSIONS[f]?.includes(r);
                    return (
                      <td key={r} className="px-4 py-3 text-center">
                        {allowed ? (
                          <span className="inline-flex h-6 w-6 rounded-full bg-emerald-50 items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center">
                            <Minus className="h-3.5 w-3.5 text-gray-300" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-surface-muted/40 text-xs text-muted-foreground text-center">
          Role permissions are system-defined. Contact Anthropic to customize.
        </div>
      </div>
    </div>
  );
}
