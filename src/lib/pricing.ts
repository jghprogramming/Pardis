// Subscription pricing.
// Annual cycle = 12 monthly payments with a 10% discount = 10.8 x monthly price.
export type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual";

export function cyclePrice(monthlyPrice: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":
      return monthlyPrice;
    case "quarterly":
      return monthlyPrice * 3;
    case "semiannual":
      return monthlyPrice * 6;
    case "annual":
      return monthlyPrice * 10.8;
  }
}
