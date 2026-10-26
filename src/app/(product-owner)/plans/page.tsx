"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";
import { cyclePrice, type BillingCycle } from "@/lib/pricing";

type Plan = {
  id: number;
  name: string;
  monthly_price: number;
  unit_cap: number;
  features: string[];
  active: boolean;
};

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "ماهانه" },
  { key: "quarterly", label: "۳ ماهه" },
  { key: "semiannual", label: "۶ ماهه" },
  { key: "annual", label: "سالانه (۱۰٪ تخفیف)" },
];

// Product-owner plans page. RLS in 002_rls.sql allows only the product
// owner to create, change or deactivate plans; other roles see this
// page's access message instead of the management form.
export default function PlansPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [unitCap, setUnitCap] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "product_owner") {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    const { data } = await supabase
      .from("plans")
      .select("id, name, monthly_price, unit_cap, features, active")
      .order("monthly_price");
    setPlans((data ?? []) as Plan[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPlan(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("plans").insert({
      name,
      monthly_price: Number(monthlyPrice),
      unit_cap: Number(unitCap),
      features: [],
      active: true,
    });
    if (error) {
      setMessage(`خطا: ${error.message}`);
    } else {
      setMessage("پلن ساخته شد.");
      setName("");
      setMonthlyPrice("");
      setUnitCap("");
      load();
    }
  }

  if (allowed === null) return <main style={{ padding: 24 }}>در حال بررسی دسترسی...</main>;
  if (!allowed)
    return (
      <main style={{ padding: 24 }}>
        دسترسی به مدیریت پلن‌ها فقط برای مدیر محصول است.
      </main>
    );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>پلن‌های اشتراک</h1>
      <form onSubmit={createPlan} style={{ display: "grid", gap: 12 }}>
        <input
          required
          placeholder="نام پلن"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          required
          type="number"
          placeholder="قیمت پایه ماهانه (تومان)"
          value={monthlyPrice}
          onChange={(e) => setMonthlyPrice(e.target.value)}
        />
        <input
          required
          type="number"
          placeholder="سقف تعداد واحد (۰ یعنی نامحدود در نمونه)"
          value={unitCap}
          onChange={(e) => setUnitCap(e.target.value)}
        />
        <button type="submit">ساخت پلن</button>
      </form>
      {message && <p>{message}</p>}
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <strong>{plan.name}</strong> — سقف واحد: {plan.unit_cap} —{" "}
            {CYCLES.map((c) => (
              <span key={c.key}>
                {c.label}: {cyclePrice(plan.monthly_price, c.key).toLocaleString("fa-IR")} تومان؛{" "}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </main>
  );
}
