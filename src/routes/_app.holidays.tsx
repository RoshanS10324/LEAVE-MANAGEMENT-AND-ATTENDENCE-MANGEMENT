import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Globe, Sparkles } from "lucide-react";
import { PageContainer, PageHeader, StatTile, DefaultActions } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/holidays")({
  head: () => ({ meta: [{ title: "Holiday Calendar — LAMS" }] }),
  component: HolidaysPage,
});

const HOLIDAYS = [
  {
    name: "Independence Day",
    date: "Jul 4, 2026",
    day: "Saturday",
    region: "United States",
    type: "National",
  },
  {
    name: "Bastille Day",
    date: "Jul 14, 2026",
    day: "Tuesday",
    region: "France",
    type: "National",
  },
  {
    name: "Eid al-Adha",
    date: "Jul 27, 2026",
    day: "Monday",
    region: "Middle East",
    type: "Religious",
  },
  {
    name: "India Independence Day",
    date: "Aug 15, 2026",
    day: "Saturday",
    region: "India",
    type: "National",
  },
  {
    name: "Labor Day",
    date: "Sep 7, 2026",
    day: "Monday",
    region: "United States",
    type: "National",
  },
  {
    name: "Mid-Autumn Festival",
    date: "Sep 25, 2026",
    day: "Friday",
    region: "APAC",
    type: "Cultural",
  },
  { name: "Gandhi Jayanti", date: "Oct 2, 2026", day: "Friday", region: "India", type: "National" },
  { name: "Diwali", date: "Nov 8, 2026", day: "Sunday", region: "India", type: "Religious" },
  {
    name: "Thanksgiving",
    date: "Nov 26, 2026",
    day: "Thursday",
    region: "United States",
    type: "National",
  },
  {
    name: "Christmas Day",
    date: "Dec 25, 2026",
    day: "Friday",
    region: "Global",
    type: "Religious",
  },
];

function HolidaysPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Holiday Calendar"
        subtitle="Regional holidays and observances across your organization"
        breadcrumbs={[{ label: "Attendance" }, { label: "Holiday Calendar" }]}
        actions={<DefaultActions />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Holidays (2026)" value="32" icon={CalendarDays} tone="primary" />
        <StatTile label="Regions" value="14" icon={Globe} tone="teal" />
        <StatTile
          label="Upcoming (30d)"
          value="3"
          hint="Next: Jul 4"
          icon={Sparkles}
          tone="warning"
        />
        <StatTile
          label="Floating Allowance"
          value="2 days"
          hint="Per employee / year"
          icon={CalendarDays}
          tone="success"
        />
      </div>
      <Card className="p-0 bg-surface border-border/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-surface-muted/40">
          <h3 className="font-semibold">Upcoming Holidays</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Next 6 months · all regions</p>
        </div>
        <div className="divide-y divide-border">
          {HOLIDAYS.map((h) => (
            <div
              key={h.name}
              className="px-6 py-4 flex items-center gap-4 hover:bg-surface-muted/40 transition-colors"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-brand text-white grid place-items-center flex-shrink-0">
                <div className="text-center leading-none">
                  <div className="text-[10px] font-semibold opacity-80 uppercase">
                    {h.date.split(" ")[0]}
                  </div>
                  <div className="text-xl font-bold mt-0.5">
                    {h.date.split(" ")[1].replace(",", "")}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{h.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {h.day} · {h.region}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {h.type}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
