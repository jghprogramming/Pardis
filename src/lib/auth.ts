import { supabase } from "./supabase";
import { asUserRole, type UserRole } from "./roles";

// Authentication helpers for the real app.
// Security rule (also enforced by 002_rls.sql): in-app signup may NEVER
// create a product_owner profile. The first product owner is created
// from the Supabase SQL editor, as documented in 002_rls.sql.

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  const role = asUserRole(data.role);
  if (!role) return null;
  return { id: data.id, full_name: data.full_name, role, phone: data.phone };
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Signup for building managers and residents only.
// Passing "product_owner" here is rejected in code as well as by RLS.
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: "building_manager" | "resident",
  phone?: string,
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { data, error };
  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role,
    phone: phone ?? null,
  });
  return { data, error: profileError };
}
