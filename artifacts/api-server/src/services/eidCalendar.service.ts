export interface EidWindowInfo {
  eidName: "adha" | "fitr";
  eidDate: string; // YYYY-MM-DD
  hijriYear: number;
  daysUntilEid: number;
  withdrawalOpensAt: string;
  withdrawalClosesAt: string;
  isWithdrawalOpen: boolean;
  daysUntilWithdrawalOpens: number;
  daysUntilWithdrawalCloses: number;
}

/**
 * Standard astronomical/Umm al-Qura projections for Eid al-Fitr (1 Shawwal)
 * and Eid al-Adha (10 Dhu al-Hijjah).
 */
const EID_PROJECTIONS: Record<number, { fitr: string; adha: string }> = {
  1447: { fitr: "2026-03-20", adha: "2026-05-27" },
  1448: { fitr: "2027-03-10", adha: "2027-05-17" },
  1449: { fitr: "2028-02-27", adha: "2028-05-05" },
  1450: { fitr: "2029-02-15", adha: "2029-04-24" },
  1451: { fitr: "2030-02-04", adha: "2030-04-13" },
};

export function getHijriYear(date: Date = new Date()): number {
  return Math.round((date.getFullYear() - 622) * (33 / 32));
}

export function getNextEidDate(type: "adha" | "fitr", now: Date = new Date()): { eidDate: Date; hijriYear: number } {
  const currentHijri = getHijriYear(now);

  for (let y = currentHijri - 1; y <= currentHijri + 2; y++) {
    const table = EID_PROJECTIONS[y];
    if (!table) continue;

    const targetDate = new Date(`${table[type]}T00:00:00Z`);
    const closeDate = new Date(targetDate);
    closeDate.setUTCDate(closeDate.getUTCDate() + 7); // Active until 7 days after Eid

    // If current time hasn't passed the withdrawal close boundary, this is the active/next cycle
    if (now.getTime() <= closeDate.getTime()) {
      return { eidDate: targetDate, hijriYear: y };
    }
  }

  // Fallback: advance 354 days (lunar year) if out of table bounds
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 354);
  return { eidDate: fallback, hijriYear: currentHijri + 1 };
}

export function computeEidWindow(type: "adha" | "fitr", now: Date = new Date()): EidWindowInfo {
  const { eidDate, hijriYear } = getNextEidDate(type, now);

  const openDate = new Date(eidDate);
  openDate.setUTCDate(openDate.getUTCDate() - 30); // 30 days (1 month) before Eid

  const closeDate = new Date(eidDate);
  closeDate.setUTCDate(closeDate.getUTCDate() + 7); // 7 days (1 week) after Eid

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilEid = Math.ceil((eidDate.getTime() - now.getTime()) / msPerDay);
  const daysUntilWithdrawalOpens = Math.ceil((openDate.getTime() - now.getTime()) / msPerDay);
  const daysUntilWithdrawalCloses = Math.ceil((closeDate.getTime() - now.getTime()) / msPerDay);

  const isWithdrawalOpen = now.getTime() >= openDate.getTime() && now.getTime() <= closeDate.getTime();

  return {
    eidName: type,
    eidDate: eidDate.toISOString().split("T")[0]!,
    hijriYear,
    daysUntilEid: Math.max(0, daysUntilEid),
    withdrawalOpensAt: openDate.toISOString().split("T")[0]!,
    withdrawalClosesAt: closeDate.toISOString().split("T")[0]!,
    isWithdrawalOpen,
    daysUntilWithdrawalOpens: Math.max(0, daysUntilWithdrawalOpens),
    daysUntilWithdrawalCloses: Math.max(0, daysUntilWithdrawalCloses),
  };
}