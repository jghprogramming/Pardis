"use client";

import { useState, type FormEvent } from "react";
import { signIn, signUp } from "@/lib/auth";

// Login / signup page. Signup offers only building_manager and resident;
// product_owner accounts are never created here (see src/lib/auth.ts).
export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"building_manager" | "resident">(
    "building_manager",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("در حال انجام...");
    if (mode === "login") {
      const { error } = await signIn(email, password);
      setMessage(error ? `خطا: ${error.message}` : "وارد شدید.");
    } else {
      const { error } = await signUp(email, password, fullName, role);
      setMessage(
        error
          ? `خطا: ${error.message}`
          : "حساب ساخته شد. ایمیل خود را برای تأیید بررسی کنید.",
      );
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1>{mode === "login" ? "ورود" : "ثبت‌نام"}</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {mode === "signup" && (
          <>
            <input
              required
              placeholder="نام و نام خانوادگی"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "building_manager" | "resident")
              }
            >
              <option value="building_manager">مدیر ساختمان</option>
              <option value="resident">ساکن</option>
            </select>
          </>
        )}
        <input
          required
          type="email"
          dir="ltr"
          placeholder="ایمیل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="password"
          dir="ltr"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">
          {mode === "login" ? "ورود" : "ثبت‌نام"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        style={{ marginTop: 12 }}
      >
        {mode === "login" ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
      </button>
      {message && <p>{message}</p>}
    </main>
  );
}
