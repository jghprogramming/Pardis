"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, type Profile } from "@/lib/auth";

type Building = {
  id: number;
  name: string;
  address: string | null;
  manager_id: string | null;
  plan_id: number | null;
};

type Unit = {
  id: number;
  unit_no: string;
  area: number;
  occupants: number;
  resident_name: string | null;
  resident_type: string | null;
  phone: string | null;
};

// Building detail + units.
// Who may do what is enforced by 002_rls.sql:
// - product_owner and the building's manager may add and delete units
//   (managers only in their own building);
// - a resident sees only their own unit row, and may not add or delete.
// The page hides the write forms for residents; the database still
// enforces the same rule if a request is sent directly.
export default function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const buildingId = Number(id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checked, setChecked] = useState(false);
  const [building, setBuilding] = useState<Building | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitNo, setUnitNo] = useState("");
  const [area, setArea] = useState("");
  const [occupants, setOccupants] = useState("1");
  const [residentName, setResidentName] = useState("");
  const [residentType, setResidentType] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const current = await getCurrentProfile();
    setProfile(current);
    setChecked(true);
    if (!current) return;
    const { data: buildingRow } = await supabase
      .from("buildings")
      .select("id, name, address, manager_id, plan_id")
      .eq("id", buildingId)
      .single();
    setBuilding((buildingRow ?? null) as Building | null);
    const { data: unitRows } = await supabase
      .from("units")
      .select("id, unit_no, area, occupants, resident_name, resident_type, phone")
      .eq("building_id", buildingId)
      .order("unit_no");
    setUnits((unitRows ?? []) as Unit[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("units").insert({
      building_id: buildingId,
      unit_no: unitNo,
      area: Number(area),
      occupants: Number(occupants),
      resident_name: residentName || null,
      resident_type: residentType || null,
      phone: phone || null,
    });
    if (error) {
      setMessage(`خطا: ${error.message}`);
    } else {
      setMessage("واحد ساخته شد.");
      setUnitNo("");
      setArea("");
      setOccupants("1");
      setResidentName("");
      setResidentType("");
      setPhone("");
      load();
    }
  }

  async function deleteUnit(unitId: number) {
    const { error } = await supabase.from("units").delete().eq("id", unitId);
    setMessage(error ? `خطا: ${error.message}` : "واحد حذف شد.");
    if (!error) load();
  }

  async function deleteBuilding() {
    const { error } = await supabase
      .from("buildings")
      .delete()
      .eq("id", buildingId);
    if (error) {
      setMessage(`خطا: ${error.message}`);
    } else {
      window.location.href = "/buildings";
    }
  }

  if (!checked) return <main style={{ padding: 24 }}>در حال بررسی...</main>;
  if (!profile)
    return (
      <main style={{ padding: 24 }}>
        برای دیدن این ساختمان ابتدا <a href="/login">وارد شوید</a>.
      </main>
    );
  if (!building)
    return (
      <main style={{ padding: 24 }}>
        این ساختمان یافت نشد یا به آن دسترسی ندارید.
      </main>
    );

  const canWrite =
    profile.role === "product_owner" ||
    (profile.role === "building_manager" &&
      building.manager_id === profile.id);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <p>
        <a href="/buildings">← ساختمان‌ها</a>
      </p>
      <h1>{building.name}</h1>
      {building.address && <p>{building.address}</p>}

      <h2>واحدها</h2>
      {canWrite && (
        <form onSubmit={createUnit} style={{ display: "grid", gap: 12 }}>
          <input
            required
            placeholder="شماره واحد"
            value={unitNo}
            onChange={(e) => setUnitNo(e.target.value)}
          />
          <input
            required
            type="number"
            placeholder="متراژ (متر مربع)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
          <input
            required
            type="number"
            placeholder="تعداد ساکنان"
            value={occupants}
            onChange={(e) => setOccupants(e.target.value)}
          />
          <input
            placeholder="نام ساکن"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
          />
          <select
            value={residentType}
            onChange={(e) => setResidentType(e.target.value)}
          >
            <option value="">نوع سکونت مشخص نیست</option>
            <option value="owner">مالک</option>
            <option value="tenant">مستأجر</option>
          </select>
          <input
            placeholder="تلفن ساکن"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit">ساخت واحد</button>
        </form>
      )}
      {message && <p>{message}</p>}
      <ul>
        {units.map((unit) => (
          <li key={unit.id}>
            واحد {unit.unit_no} — {unit.area} متر — {unit.occupants} نفر
            {unit.resident_name ? ` — ${unit.resident_name}` : ""}
            {unit.resident_type === "owner"
              ? " (مالک)"
              : unit.resident_type === "tenant"
                ? " (مستأجر)"
                : ""}
            {canWrite && (
              <button
                onClick={() => deleteUnit(unit.id)}
                style={{ marginRight: 12 }}
              >
                حذف واحد
              </button>
            )}
          </li>
        ))}
      </ul>
      {units.length === 0 && <p>هنوز واحدی ثبت نشده است.</p>}

      {canWrite && (
        <button
          onClick={deleteBuilding}
          style={{ marginTop: 24, color: "red" }}
        >
          حذف این ساختمان
        </button>
      )}
    </main>
  );
}
