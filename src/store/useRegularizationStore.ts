import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";

export type Regularization = {
  id: string;
  emp_id: string;
  date: string;
  req_in: string;
  req_out: string;
  reason: string;
  remarks?: string;
  status: "Pending" | "Manager_Approved" | "Approved" | "Rejected";
  created_at: string;
  employees?: { name: string; department?: string; designation?: string };
};

type ToastMsg = {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

interface RegularizationStore {
  pendingRegularizations: Regularization[];
  isLoading: boolean;
  toastQueue: ToastMsg[];
  currentUserRole: string | null;

  hydrate: (role: string | null, employeeId: string | null) => Promise<void>;
  approveRegularization: (id: string) => Promise<void>;
  rejectRegularization: (id: string) => Promise<void>;
  showToast: (message: string, type?: ToastMsg["type"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useRegularizationStore = create<RegularizationStore>((set, get) => ({
  pendingRegularizations: [],
  isLoading: false,
  toastQueue: [],
  currentUserRole: null,

  showToast: (message, type = "info") => {
    const id = ++toastId;
    set((state) => ({ toastQueue: [...state.toastQueue, { id, message, type }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) => {
    set((state) => ({ toastQueue: state.toastQueue.filter((t) => t.id !== id) }));
  },

  hydrate: async (role, employeeId) => {
    if (!employeeId) return;
    set({ isLoading: true });

    try {
      if (role === "manager" || role === "hr" || role === "super_admin") {
        set({ currentUserRole: role });
        let teamIds: string[] = [];
        
        if (role === "manager") {
          const { data: team } = await supabase
            .from("employees")
            .select("id")
            .eq("manager_id", employeeId);
          teamIds = (team || []).map((e: any) => e.id);
        }

        if (role === "hr" || role === "super_admin" || teamIds.length > 0) {
          let q = supabase
            .from("regularizations")
            .select("*, employees(name, department, designation)")
            .order("created_at", { ascending: false });

          if (role === "manager") {
            q = q.in("emp_id", teamIds).eq("status", "Pending");
          } else {
            // HR sees both Pending and Manager_Approved
            q = q.in("status", ["Pending", "Manager_Approved"]);
          }

          const { data } = await q;
          set({ pendingRegularizations: data || [] });
        } else {
          set({ pendingRegularizations: [] });
        }
      }
    } catch (err) {
      console.error("Error fetching regularizations:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  approveRegularization: async (id) => {
    const role = get().currentUserRole;
    const reg = get().pendingRegularizations.find((r) => r.id === id);
    set((state) => ({ pendingRegularizations: state.pendingRegularizations.filter((r) => r.id !== id) }));

    if (role === "manager") {
      const { error } = await supabase
        .from("regularizations")
        .update({ status: "Manager_Approved" })
        .eq("id", id);
      if (error) throw error;
      
      if (reg) {
        await supabase.from("notifications").insert({
          user_id: reg.emp_id,
          message: `Your regularization request for ${reg.date} was approved by your manager and sent to HR.`,
        });
      }

      get().showToast("Regularization approved by Manager. Sent to HR.", "success");
      return;
    }

    // HR Final Approval
    const { error } = await supabase
      .from("regularizations")
      .update({ status: "Approved", attendance_updated: true })
      .eq("id", id);
    if (error) throw error;
    
    if (reg) {
      await supabase.from("notifications").insert({
        user_id: reg.emp_id,
        message: `Your regularization request for ${reg.date} was fully approved by HR.`,
      });

      // Update actual attendance table if it exists
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("emp_id", reg.emp_id)
        .eq("date", reg.date)
        .maybeSingle();

      if (existing) {
        await supabase.from("attendance").update({
          check_in: reg.req_in,
          check_out: reg.req_out,
          status: "Present",
          source: "regularized",
        }).eq("id", existing.id);
      } else {
        await supabase.from("attendance").insert({
          emp_id: reg.emp_id,
          date: reg.date,
          check_in: reg.req_in,
          check_out: reg.req_out,
          status: "Present",
          source: "regularized",
        });
      }
    }

    get().showToast("Regularization fully approved. Attendance updated.", "success");
  },

  rejectRegularization: async (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;

    const reg = get().pendingRegularizations.find((r) => r.id === id);
    set((state) => ({ pendingRegularizations: state.pendingRegularizations.filter((r) => r.id !== id) }));

    const { error } = await supabase
      .from("regularizations")
      .update({ status: "Rejected" })
      .eq("id", id);
    if (error) throw error;

    if (reg) {
      await supabase.from("notifications").insert({
        user_id: reg.emp_id,
        message: `Your regularization request for ${reg.date} was rejected. Reason: ${reason}`,
      });
    }

    get().showToast(`Regularization rejected: ${reason}`, "info");
  },
}));
