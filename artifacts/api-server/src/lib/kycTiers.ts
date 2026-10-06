/** Xpress Wallet tier limits (from the commercial sheet). Unknown tier => strictest tier, never the loosest. */
export const TIER_LIMITS = {
  TIER_1: { dailyLimit: 50_000, maxBalance: 300_000 as number | null },
  TIER_2: { dailyLimit: 200_000, maxBalance: 500_000 as number | null },
  TIER_3: { dailyLimit: 5_000_000, maxBalance: null as number | null },
} as const;

export function limitsFor(tier?: string | null): { dailyLimit: number; maxBalance: number | null } {
  return TIER_LIMITS[(tier ?? "TIER_1") as keyof typeof TIER_LIMITS] ?? TIER_LIMITS.TIER_1;
}