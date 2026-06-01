"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useT } from "@/components/Providers";

type Mode = "login" | "register";

export default function JoinPage() {
  const t = useT();
  // already signed in? skip the form, go straight to the portfolio
  const { status } = useSession();
  useEffect(() => {
    if (status === "authenticated") window.location.replace("/portfolio");
  }, [status]);

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t.join_err_fail);
        }
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        throw new Error(t.join_err_creds);
      }
      window.location.href = "/portfolio";
    } catch (err) {
      setError(err instanceof Error ? err.message : t.join_err_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="glass fade-up"
        style={{ width: "100%", maxWidth: 400, padding: 32 }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <span className="display" style={{ fontSize: "1.6rem" }}>XX</span>
          <span className="eyebrow" style={{ letterSpacing: ".28em" }}>Arena</span>
        </Link>
        <p
          style={{
            color: "var(--muted)",
            fontSize: ".85rem",
            marginTop: 6,
            marginBottom: 24,
          }}
        >
          {mode === "login" ? t.join_welcome_back : t.join_welcome_new}
        </p>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: "var(--fill)",
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className="mono"
              style={{
                flex: 1,
                padding: ".55rem",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: ".72rem",
                background:
                  mode === m ? "var(--fill-2)" : "transparent",
                color: mode === m ? "var(--ink)" : "var(--muted)",
                transition: "all .2s",
              }}
            >
              {m === "login" ? t.join_tab_login : t.join_tab_register}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {mode === "register" && (
            <Field
              label={t.join_name}
              value={name}
              onChange={setName}
              type="text"
              placeholder={t.join_name_ph}
            />
          )}
          <Field
            label={t.join_email}
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="sen@ornek.com"
          />
          <Field
            label={t.join_pass}
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />

          {error && (
            <div
              className="mono"
              style={{ fontSize: ".7rem", color: "var(--red-t)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-accent"
            style={{
              width: "100%",
              padding: ".85rem",
              marginTop: 4,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy
              ? "..."
              : mode === "login"
                ? t.join_submit_login
                : t.join_submit_register}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          width: "100%",
          padding: ".7rem .8rem",
          borderRadius: 9,
          border: "1px solid var(--card-border)",
          background: "var(--fill)",
          color: "var(--ink)",
          fontSize: ".88rem",
          fontFamily: "var(--font-sans)",
          outline: "none",
        }}
      />
    </label>
  );
}
