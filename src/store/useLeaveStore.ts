import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";
import { 
  emailLeaveApplied, 
  emailManagerApproved, 
  emailManagerRejected, 
  emailHRActionNeeded, 
  emailFullyApproved, 
  emailRejectedByHR 
} from "../utils/emailService";

type LeaveBalance = {
  id: string;
  emp_id: string;
  leave_type_id: string;
  year: number;
  total: number;
  used: number;
  leave_types?: { name: string; is_paid: boolean };
};

type LeaveApplication = {
  id: string;
  emp_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  created_at: string;
  leave_types?: { name: string };
  employees?: { name: string; department?: string; designation?: string };
};

type ToastMsg = {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

interface LeaveStore {
  balances: LeaveBalance[];
  myLeaves: LeaveApplication[];
  pendingLeaves: LeaveApplication[];
  isLoading: boolean;
  toastQueue: ToastMsg[];
  currentUserRole: string | null;

  hydrate: (role: string | null, employeeId: string | null) => Promise<void>;
  applyLeave: (leaveData: any) => Promise<void>;
  cancelLeave: (
    id: string,
    days: number,
    leaveTypeId: string,
    currentStatus: string,
    empId: string,
  ) => Promise<void>;
  approveLeave: (id: string, days: number, leaveTypeId: string, empId: string) => Promise<void>;
  rejectLeave: (id: string) => Promise<void>;
  showToast: (message: string, type?: ToastMsg["type"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useLeaveStore = create<LeaveStore>((set, get) => ({
  balances: [],
  myLeaves: [],
  pendingLeaves: [],
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
      let { data: bData } = await supabase
        .from("leave_balances")
        .select("*, leave_types(name, is_paid)")
        .eq("emp_id", employeeId)
        .eq("year", new Date().getFullYear());

      // Auto-provision balances if none exist for the current year
      if (!bData || bData.length === 0) {
        const { data: leaveTypes } = await supabase.from("leave_types").select("id");
        if (leaveTypes && leaveTypes.length > 0) {
          const newBalances = leaveTypes.map((lt) => ({
            emp_id: employeeId,
            leave_type_id: lt.id,
            year: new Date().getFullYear(),
            total: 10, // Default allocation
            used: 0,
          }));
          await supabase.from("leave_balances").insert(newBalances);

          // Fetch again after inserting
          const { data: newBData } = await supabase
            .from("leave_balances")
            .select("*, leave_types(name, is_paid)")
            .eq("emp_id", employeeId)
            .eq("year", new Date().getFullYear());
          bData = newBData;
        }
      }

      const { data: myData } = await supabase
        .from("leave_applications")
        .select("*, leave_types(name)")
        .eq("emp_id", employeeId)
        .order("created_at", { ascending: false });

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
            .from("leave_applications")
            .select("*, employees(name, department, designation), leave_types(name)")
            .order("created_at", { ascending: false });

          if (role === "manager") {
            q = q.in("emp_id", teamIds).eq("status", "Pending");
          } else {
            q = q.in("status", ["Pending", "Manager_Approved"]);
          }

          const { data: pData } = await q;
          set({ pendingLeaves: pData || [] });
        } else {
          set({ pendingLeaves: [] });
        }
      }

      set({ balances: bData || [], myLeaves: myData || [], isLoading: false });
    } catch (err) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  applyLeave: async (leaveData: Record<string, any>) => {
    // 1. Fetch employee and manager data
    const { data: empData } = await supabase
      .from("employees")
      .select("*, manager:employees!manager_id(*)")
      .eq("id", leaveData.emp_id)
      .single();

    const manager_id = empData?.manager_id;

    // 2. Insert application
    const { data, error } = await supabase
      .from("leave_applications")
      .insert([leaveData])
      .select("*, leave_types(name)")
      .single();
    if (error) throw error;

    // 3. Notify manager via app bell and email
    if (manager_id) {
      try {
        await supabase.from("notifications").insert({
          user_id: manager_id,
          message: `${empData?.name || "An employee"} has applied for ${data.leave_types?.name} leave from ${leaveData.from_date} to ${leaveData.to_date} (${leaveData.days} day(s)). Action required.`,
        });
      } catch (err) {
        console.warn("Manager notification bell failed (possibly blocked by browser):", err);
      }

      if (empData?.manager) {
        emailLeaveApplied(
          { 
            leave_type_name: data.leave_types?.name, 
            from_date: leaveData.from_date, 
            to_date: leaveData.to_date, 
            days: leaveData.days, 
            reason: leaveData.reason 
          },
          empData,
          empData.manager
        ).catch(err => console.error("Email failed:", err));
      }
    }

    // 4. Also notify HR and Super Admin in their bell icon
    try {
      const { data: adminUsers } = await supabase.from("employees").select("id").in("role", ["hr", "super_admin"]);
      if (adminUsers && adminUsers.length > 0) {
        const adminNotifs = adminUsers
          .filter(admin => admin.id !== manager_id) // don't duplicate for manager
          .map(admin => ({
            user_id: admin.id,
            message: `${empData?.name || "An employee"} applied for ${data.leave_types?.name} leave. Pending approval.`,
          }));
        if (adminNotifs.length > 0) {
          await supabase.from("notifications").insert(adminNotifs);
        }
      }
    } catch (err) {
      console.warn("Admin notification bell failed:", err);
    }

    set((state) => ({ myLeaves: [data, ...state.myLeaves] }));
    get().showToast("Leave applied successfully. Awaiting approval.", "success");
  },

  cancelLeave: async (id, days, leaveTypeId, currentStatus, empId) => {
    const { error } = await supabase
      .from("leave_applications")
      .update({ status: "Cancelled" })
      .eq("id", id);
    if (error) throw error;

    if (currentStatus === "Approved") {
      const year = new Date().getFullYear();
      try {
        await supabase.rpc("decrement_leave_balance", {
          p_emp_id: empId,
          p_leave_type_id: leaveTypeId,
          p_year: year,
          p_days: days,
        });
      } catch {
        const { data: bal } = await supabase
          .from("leave_balances")
          .select("used")
          .eq("emp_id", empId)
          .eq("leave_type_id", leaveTypeId)
          .eq("year", year)
          .single();
        if (bal) {
          await supabase
            .from("leave_balances")
            .update({ used: Math.max(0, bal.used - days) })
            .eq("emp_id", empId)
            .eq("leave_type_id", leaveTypeId)
            .eq("year", year);
        }
      }
      set((state) => ({
        balances: state.balances.map((b) =>
          b.leave_type_id === leaveTypeId && b.year === year
            ? { ...b, used: Math.max(0, b.used - days) }
            : b,
        ),
      }));
    }

    set((state) => ({
      myLeaves: state.myLeaves.map((l) => (l.id === id ? { ...l, status: "Cancelled" } : l)),
    }));
    get().showToast("Leave cancelled successfully.", "success");
  },

  approveLeave: async (id, days, leaveTypeId, empId) => {
    const role = get().currentUserRole;
    const leaveApp = get().pendingLeaves.find((l) => l.id === id);
    set((state) => ({ pendingLeaves: state.pendingLeaves.filter((l) => l.id !== id) }));

    // 1. Fetch Employee, Manager, and HR data for notifications
    const { data: empData } = await supabase.from("employees").select("*, manager:employees!manager_id(*)").eq("id", empId).single();
    const { data: hrUsers } = await supabase.from("employees").select("*").in("role", ["hr", "super_admin"]);

    if (role === "manager") {
      // Step 1: Manager Approval (does NOT deduct balance yet)
      const { error } = await supabase
        .from("leave_applications")
        .update({ status: "Manager_Approved" })
        .eq("id", id);
      if (error) throw error;

      // Notify Employee
      await supabase.from("notifications").insert({
        user_id: empId,
        message: `Your leave request has been approved by your manager and sent to HR.`,
      });
      if (empData && empData.manager && leaveApp) {
        emailManagerApproved(
          { ...leaveApp, leave_type_name: leaveApp.leave_types?.name }, 
          empData, 
          empData.manager
        ).catch(console.error);
      }

      // Notify all HRs
      if (hrUsers && hrUsers.length > 0) {
        const hrNotifs = hrUsers.map(hr => ({
          user_id: hr.id,
          message: `${empData?.name || "An employee"}'s leave request was approved by their manager. HR validation needed.`,
        }));
        await supabase.from("notifications").insert(hrNotifs);
        
        if (empData && empData.manager && leaveApp) {
          hrUsers.forEach(hr => {
            emailHRActionNeeded(
              { ...leaveApp, leave_type_name: leaveApp.leave_types?.name }, 
              empData, 
              empData.manager, 
              hr
            ).catch(console.error);
          });
        }
      }

      get().showToast("Leave approved by Manager. Sent to HR for validation.", "success");
      return;
    }

    // Step 2: HR / Super Admin Final Approval
    const year = new Date().getFullYear();
    try {
      await supabase.rpc("increment_leave_balance", {
        p_emp_id: empId,
        p_leave_type_id: leaveTypeId,
        p_year: year,
        p_days: days,
      });
    } catch {
      const { data: bal } = await supabase
        .from("leave_balances")
        .select("used")
        .eq("emp_id", empId)
        .eq("leave_type_id", leaveTypeId)
        .eq("year", year)
        .single();
      if (bal) {
        await supabase
          .from("leave_balances")
          .update({ used: bal.used + days })
          .eq("emp_id", empId)
          .eq("leave_type_id", leaveTypeId)
          .eq("year", year);
      }
    }

    const { error } = await supabase
      .from("leave_applications")
      .update({ status: "Approved" })
      .eq("id", id);
    if (error) throw error;

    // Notify Employee of Final Approval
    await supabase.from("notifications").insert({
      user_id: empId,
      message: `Your leave request has been fully approved by HR.`,
    });
    if (empData && leaveApp) {
      emailFullyApproved({ ...leaveApp, leave_type_name: leaveApp.leave_types?.name }, empData).catch(console.error);
    }

    get().showToast("Leave fully approved. Balance updated.", "success");
  },

  rejectLeave: async (id) => {
    const reason = window.prompt("Please provide a reason for rejecting this leave:");
    if (reason === null) return; // Action cancelled

    const role = get().currentUserRole;
    const leaveApp = get().pendingLeaves.find((l) => l.id === id);
    set((state) => ({ pendingLeaves: state.pendingLeaves.filter((l) => l.id !== id) }));
    
    // We update the status to Rejected.
    const { error } = await supabase
      .from("leave_applications")
      .update({ status: "Rejected" })
      .eq("id", id);
    if (error) throw error;

    // Notify Employee
    if (leaveApp) {
      const { data: empData } = await supabase.from("employees").select("*, manager:employees!manager_id(*)").eq("id", leaveApp.emp_id).single();
      if (empData) {
        await supabase.from("notifications").insert({
          user_id: empData.id,
          message: `Your leave request was rejected by ${role === "manager" ? "your Manager" : "HR"}. Reason: ${reason}`,
        });

        if (role === "manager" && empData.manager) {
          emailManagerRejected(
            { ...leaveApp, leave_type_name: leaveApp.leave_types?.name }, 
            empData, 
            empData.manager, 
            reason
          ).catch(console.error);
        } else if ((role === "hr" || role === "super_admin")) {
          emailRejectedByHR(
            { ...leaveApp, leave_type_name: leaveApp.leave_types?.name }, 
            empData, 
            reason
          ).catch(console.error);
        }
      }
    }

    get().showToast(`Leave rejected. Reason: ${reason}`, "info");
  },
}));
