import { createFileRoute } from "@tanstack/react-router";
import { Clock, Users, Moon, Sunrise, MoreHorizontal, X } from "lucide-react";
import { PageContainer, PageHeader, StatTile, DefaultActions } from "@/components/lams/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/_app/shifts")({
  head: () => ({ meta: [{ title: "Shifts — LAMS" }] }),
  component: ShiftsPage,
});

function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  useEffect(() => {
    async function loadShifts() {
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setShifts(data);
    }
    loadShifts();
  }, []);

  const handleAddShift = async () => {
    if (!newName || !newStart || !newEnd) return;
    const { data, error } = await supabase
      .from("shifts")
      .insert([{ name: newName, start_time: newStart, end_time: newEnd }])
      .select()
      .single();
    if (data) setShifts([...shifts, data]);
    setShowForm(false);
    setNewName("");
    setNewStart("");
    setNewEnd("");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Shifts"
        subtitle="Manage shift patterns, rosters, and assignments"
        breadcrumbs={[{ label: "Attendance" }, { label: "Shifts" }]}
        actions={<Button onClick={() => setShowForm(true)}>Add Shift</Button>}
      />

      {showForm && (
        <Card className="p-6 bg-surface border-border/60 relative">
          <button
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            onClick={() => setShowForm(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-lg mb-4">New Shift</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Shift Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Morning Shift"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddShift} disabled={!newName || !newStart || !newEnd}>
              Create Shift
            </Button>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Shift Patterns"
          value={shifts.length.toString()}
          icon={Clock}
          tone="primary"
        />
        <StatTile label="Employees Assigned" value="12,840" icon={Users} tone="success" />
        <StatTile
          label="Night Shift"
          value="980"
          hint="7.6% of workforce"
          icon={Sunrise}
          tone="teal"
        />
        <StatTile label="Rotational Coverage" value="98%" icon={Clock} tone="warning" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((s) => {
          return (
            <Card
              key={s.id}
              className="p-5 bg-surface border-border/60 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`h-11 w-11 rounded-xl grid place-items-center bg-primary/10 text-primary`}
                >
                  <Sunrise className="h-5 w-5" />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-4 font-semibold text-lg">{s.name}</h3>
              <div className="text-sm font-mono text-muted-foreground mt-1">
                {s.start_time} – {s.end_time}
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workdays</span>
                  <span className="font-semibold">Mon-Fri</span>
                </div>
              </div>
              <Badge variant="secondary" className="mt-4 text-[10px]">
                Active roster
              </Badge>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
