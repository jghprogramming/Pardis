"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, type Profile } from "@/lib/auth";

type Building = {
  id: number;
  name: string;
  address: string | null;
  manager_id: string | null;
  plan_id: number | null;
};

type Plan = {
  id: number;
  name: string;
};

// Buildings module, list + create.
// Access is enforced by the database (002_rls.sql), not only here:
// - product_owner sees all buildings and may create them;
// - building_manager sees only buildings where manager_id is their id
//   (RLS gives managers no insert on buildings, so only the product
//   owner creates a building and assigns its manager);
// - resident sees only their own building, through their unit.
export default function BuildingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checked, setChecked] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [planId, setPlanId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const current = await getCurrentProfile();
    setProfile(current);
    setChecked(true);
    if (!current) return;
    const { data } = await supabase
      .from("buildings")
      .select("id, name, address, manager_id, plan_id")
      .order("id");
    setBuildings((data ?? []) as Building[]);
    const { data: planRows } = await supabase
      .from("plans")
      .select("id, name")
      .eq("active", true)
      .order("name");
    setPlans((planRows ?? []) as Plan[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createBuilding(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("buildings").insert({
      name,
      address: address || null,
      plan_id: planId ? Number(planId) : null,
    });
    if (error) {
      setMessage(`خطا: ${error.message}`);
    } else {
      setMessage("ساختمان ساخته شد.");
      setName("");
      setAddress("");
      setPlanId("");
      load();
    }
  }

  if (!checked) return <main style={{ padding: 24 }}>در حال بررسی دسترسی...</main>;
  if (!profile)
    return (
      <main style={{ padding: 24 }}>
        برای دیدن ساختمان‌ها ابتدا <a href="/login">وارد شوید</a>.
      </main>
    );

  const isOwner = profile.role === "product_owner";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>ساختمان‌ها</h1>
      {isOwner && (
        <form onSubmit={createBuilding} style={{ display: "grid", gap: 12 }}>
          <input
            required
            placeholder="نام ساختمان"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="نشانی"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">بدون پلن (بعداً تعیین می‌شود)</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <button type="submit">ساخت ساختمان</button>
        </form>
      )}
      {!isOwner && (
        <p>
          شما فقط ساختمان‌هایی را می‌بینید که به شما مربوط است؛ ساخت
          ساختمان جدید با مدیر محصول است.
        </p>
      )}
      {message && <p>{message}</p>}
      <ul>
        {buildings.map((building) => (
          <li key={building.id}>
            <a href={`/buildings/${building.id}`}>
              <strong>{building.name}</strong>
            </a>
            {building.address ? ` — ${building.address}` : ""}
          </li>
        ))}
      </ul>
      {buildings.length === 0 && <p>هنوز ساختمانی ثبت نشده است.</p>}
    </main>
  );
}
