import { EidRepository } from "../repositories/eid.repository.js";

function getHijriDate(date: Date): string {
  try {
    return date.toLocaleDateString("en-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "Dhul-Hijjah 1447";
  }
}

export const EidService = {
  async getDates() {
    const cycles = await EidRepository.findActiveCycles();
    const now = new Date();

    const adha = cycles.find(c => c.eidType === "adha") ?? {
      id: "static-adha", eidType: "adha", year: 2026,
      eidDate: "2026-06-17", withdrawalUnlockDate: "2026-05-18",
      deliveryStartDate: "2026-06-10", deliveryEndDate: "2026-06-17",
      isActive: true, createdAt: now,
    };

    const fitr = cycles.find(c => c.eidType === "fitr") ?? {
      id: "static-fitr", eidType: "fitr", year: 2027,
      eidDate: "2027-03-20", withdrawalUnlockDate: "2027-02-18",
      deliveryStartDate: "2027-03-18", deliveryEndDate: "2027-03-20",
      isActive: true, createdAt: now,
    };

    function toCycleResponse(cycle: typeof adha) {
      const eidDate = new Date(cycle.eidDate);
      const daysUntilEid = Math.max(0, Math.ceil((eidDate.getTime() - now.getTime()) / 86400000));
      return {
        id: cycle.id,
        eidType: cycle.eidType as "adha" | "fitr",
        year: cycle.year,
        eidDate: cycle.eidDate,
        withdrawalUnlockDate: cycle.withdrawalUnlockDate,
        deliveryStartDate: cycle.deliveryStartDate,
        deliveryEndDate: cycle.deliveryEndDate,
        isActive: cycle.isActive,
        daysUntilEid,
        hijriDate: getHijriDate(now),
      };
    }

    return {
      adha: toCycleResponse(adha),
      fitr: toCycleResponse(fitr),
      currentHijriDate: getHijriDate(now),
    };
  },
};
