import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Search, Filter, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        {breadcrumbs && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Link to="/dashboard" className="hover:text-foreground">
              Home
            </Link>
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {b.to ? (
                  <a href={b.to} className="hover:text-foreground">
                    {b.label}
                  </a>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          {title}
          {badge}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">{children}</div>;
}

export function FilterBar({
  placeholder = "Search…",
  filters,
  right,
  searchValue,
  onSearchChange,
}: {
  placeholder?: string;
  filters?: { label: string; value?: string }[];
  right?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}) {
  return (
    <Card className="p-3 bg-surface border-border/60 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9 h-10 bg-surface-muted border-border"
        />
      </div>
      {filters?.map((f) => (
        <Button key={f.label} variant="outline" size="sm" className="h-10 gap-1.5">
          <Filter className="h-3.5 w-3.5" /> {f.label}
          {f.value && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {f.value}
            </Badge>
          )}
        </Button>
      ))}
      <div className="flex gap-2 ml-auto">{right}</div>
    </Card>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "primary",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "teal" | "destructive";
  icon?: any;
}) {
  const cls: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    teal: "bg-teal/15 text-teal",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-5 bg-surface border-border/60">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <div className={`h-9 w-9 rounded-lg grid place-items-center ${cls[tone]}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

export function StatusPill({
  status,
}: {
  status:
    | "Approved"
    | "Pending"
    | "Rejected"
    | "Active"
    | "Inactive"
    | "Draft"
    | "Synced"
    | "Failed"
    | "Present"
    | "Absent"
    | "Late"
    | "On Leave"
    | "WFH";
}) {
  const map: Record<string, string> = {
    Approved: "bg-success/10 text-success border-success/20",
    Active: "bg-success/10 text-success border-success/20",
    Synced: "bg-success/10 text-success border-success/20",
    Present: "bg-success/10 text-success border-success/20",
    Pending: "bg-warning/15 text-warning border-warning/30",
    Draft: "bg-muted text-muted-foreground border-border",
    Inactive: "bg-muted text-muted-foreground border-border",
    Late: "bg-warning/15 text-warning border-warning/30",
    WFH: "bg-teal/15 text-teal border-teal/30",
    "On Leave": "bg-primary/10 text-primary border-primary/20",
    Rejected: "bg-destructive/10 text-destructive border-destructive/20",
    Failed: "bg-destructive/10 text-destructive border-destructive/20",
    Absent: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}
    >
      ● {status}
    </span>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <Card className="bg-surface border-border/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted border-b border-border">
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-surface-muted/60 transition-colors"
              >
                {r.map((cell, j) => (
                  <td key={j} className="px-4 py-3 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-muted/40 text-xs text-muted-foreground">
        <span>
          Showing 1–{rows.length} of {rows.length}
        </span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8">
            Previous
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function DefaultActions() {
  return (
    <>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-1.5" /> Export
      </Button>
      <Button size="sm" className="bg-gradient-brand text-white">
        <Plus className="h-4 w-4 mr-1" /> New
      </Button>
    </>
  );
}
