// Charge calculation for one unit in one charge period.
// Mirrors the `charge_periods` and `bills` tables in
// supabase/migrations/001_init.sql and the four methods the user
// approved: fixed, area, occupants, combined.
//
// "combined" = fixed amount + (per_sqm x area) + (per_person x occupants).
// That matches the demo's period form, which asks for all three inputs
// when the method is "combined".
//
// Special costs are NOT split here: the caller passes the unit's own
// special share (equal split across the building's units is the
// recommended rule — see docs/next-steps.md). Keeping the share as an
// input avoids rounding drift when a total is divided by unit count.

export type ChargeMethod = "fixed" | "area" | "occupants" | "combined";

export type UnitInput = {
  area: number; // square metres
  occupants: number;
};

export type PeriodInput = {
  method: ChargeMethod;
  fixedAmount: number; // تومان
  perSqm: number; // تومان per square metre
  perPerson: number; // تومان per person
  lateFeePercent: number; // e.g. 5 means 5%
};

export type BillBreakdown = {
  baseAmount: number;
  specialShare: number;
  lateFee: number;
  totalDue: number;
  paidAmount: number;
  remaining: number;
  status: "paid" | "partial" | "unpaid";
};

export function baseCharge(unit: UnitInput, period: PeriodInput): number {
  switch (period.method) {
    case "fixed":
      return period.fixedAmount;
    case "area":
      return period.perSqm * unit.area;
    case "occupants":
      return period.perPerson * unit.occupants;
    case "combined":
      return (
        period.fixedAmount +
        period.perSqm * unit.area +
        period.perPerson * unit.occupants
      );
  }
}

export function calculateBill(
  unit: UnitInput,
  period: PeriodInput,
  specialShare: number,
  paidAmount = 0,
): BillBreakdown {
  const baseAmount = baseCharge(unit, period);
  const lateFee = Math.round(
    ((baseAmount + specialShare) * period.lateFeePercent) / 100,
  );
  const totalDue = baseAmount + specialShare + lateFee;
  const remaining = totalDue - paidAmount;
  const status =
    remaining <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
  return { baseAmount, specialShare, lateFee, totalDue, paidAmount, remaining, status };
}

// Split a period's special costs equally across units, in whole تومان.
// Any remainder (from rounding) goes to the first units, so the shares
// always add up exactly to the total — no تومان is lost or created.
export function splitSpecialCosts(total: number, unitCount: number): number[] {
  if (unitCount <= 0) return [];
  const share = Math.floor(total / unitCount);
  const remainder = total - share * unitCount;
  return Array.from({ length: unitCount }, (_, i) =>
    i < remainder ? share + 1 : share,
  );
}
