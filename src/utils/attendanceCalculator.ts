import { supabase } from "../lib/supabaseClient";

export function parseTimeToMins(timeStr: string | null) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function calculateWorkingHours(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const inMins = parseTimeToMins(checkIn);
  const outMins = parseTimeToMins(checkOut);
  return Math.max(0, (outMins - inMins) / 60);
}

export async function processAttendanceFlags(
  attId: string,
  empId: string,
  shiftId: string | null,
  checkIn: string,
  checkOut: string | null,
) {
  try {
    let expectedInMins = 9 * 60;
    let expectedOutMins = 18 * 60;
    let lateThresholdMins = 15;
    let earlyLeaveThresholdMins = 15;
    let workingHours = 9;

    if (shiftId) {
      const { data: shift } = await supabase.from("shifts").select("*").eq("id", shiftId).single();
      if (shift) {
        expectedInMins = parseTimeToMins(shift.start_time);
        expectedOutMins = parseTimeToMins(shift.end_time);
        lateThresholdMins = shift.late_threshold_mins ?? 15;
        earlyLeaveThresholdMins = shift.early_leave_threshold_mins ?? 15;
        workingHours = shift.working_hours ?? ((expectedOutMins - expectedInMins) / 60);
      }
    }

    const actualInMins = parseTimeToMins(checkIn);
    const isLate = actualInMins > expectedInMins + lateThresholdMins;
    let lateByMins = 0;
    if (isLate) lateByMins = actualInMins - (expectedInMins + lateThresholdMins);

    let isEarlyLeave = false;
    let earlyByMins = 0;
    let overtimeHours = 0;
    let totalHours = 0;

    if (checkOut) {
      const actualOutMins = parseTimeToMins(checkOut);
      totalHours = (actualOutMins - actualInMins) / 60;
      const earlyThreshold = expectedOutMins - earlyLeaveThresholdMins;

      if (actualOutMins < earlyThreshold) {
        isEarlyLeave = true;
        earlyByMins = earlyThreshold - actualOutMins;
      }

      if (actualOutMins > expectedOutMins + 30) {
        overtimeHours = Math.max(0, totalHours - workingHours);
      }
    }

    await supabase
      .from("attendance")
      .update({
        is_late: isLate,
        late_by_mins: lateByMins,
        early_leave: isEarlyLeave,
        early_by_mins: earlyByMins,
        overtime_hours: overtimeHours > 0 ? parseFloat(overtimeHours.toFixed(2)) : 0,
        total_hours: parseFloat(totalHours.toFixed(2)),
      })
      .eq("id", attId);
  } catch (err) {
    console.error("Error processing attendance flags:", err);
  }
}

export function calculateStatus(checkInTime: string | null, shift: any) {
  if (!checkInTime) return { isLate: false, lateByMins: 0, status: "Absent" };

  const [inH, inM] = checkInTime.split(":").map(Number);
  const [shH, shM] = (shift?.start_time || "09:00").split(":").map(Number);
  const inMins = inH * 60 + inM;
  const shMins = shH * 60 + shM;
  const threshold = shift?.late_threshold_mins ?? 15;
  const thresholdMins = shMins + threshold;
  const isLate = inMins > thresholdMins;

  return {
    isLate,
    lateByMins: isLate ? inMins - thresholdMins : 0,
    status: isLate ? "Late" : "Present",
  };
}

export function calculateCheckout(
  checkInTime: string | null,
  checkOutTime: string | null,
  shift: any,
) {
  if (!checkInTime || !checkOutTime)
    return { totalHours: 0, overtimeHours: 0, isEarlyLeave: false, earlyByMins: 0 };

  const inMins = parseTimeToMins(checkInTime);
  const outMins = parseTimeToMins(checkOutTime);
  const totalHours = parseFloat(((outMins - inMins) / 60).toFixed(2));

  const [eH, eM] = (shift?.end_time || "18:00").split(":").map(Number);
  const shiftEndMins = eH * 60 + eM;
  const earlyThreshold = shift?.early_leave_threshold_mins ?? 15;
  const earlyThresholdMins = shiftEndMins - earlyThreshold;
  const isEarlyLeave = outMins < earlyThresholdMins;
  const workingHours = shift?.working_hours ?? ((shiftEndMins - parseTimeToMins(shift?.start_time || "09:00")) / 60);
  const overtimeHours = parseFloat(Math.max(0, totalHours - workingHours).toFixed(2));

  return {
    totalHours,
    overtimeHours,
    isEarlyLeave,
    earlyByMins: isEarlyLeave ? earlyThresholdMins - outMins : 0,
  };
}

export function formatHours(decimal: number | null | undefined) {
  if (!decimal || decimal <= 0) return "--";
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getWorkingDaysCount(year: number, month: number) {
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
  const endDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
  const end = new Date(year, month - 1, endDay);
  let count = 0;
  for (let d = new Date(year, month - 1, 1); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
}

export function isWeekendDay(dateStr: string, policy: any) {
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 0) return true;
  if (day === 6) {
    if (policy?.saturday === "off") return true;
    if (policy?.saturday === "alternate") {
      const weekNum = Math.ceil(d.getDate() / 7);
      return policy.alternate_saturday === "odd" ? weekNum % 2 === 1 : weekNum % 2 === 0;
    }
  }
  return false;
}
