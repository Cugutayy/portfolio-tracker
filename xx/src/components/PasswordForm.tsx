"use client";

import { useState } from "react";
import { useT } from "./Providers";

export function PasswordForm() {
  const t = useT();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 6) {
      setMsg({ kind: "err", text: t.pf_min });
      return;
    }
    if (next !== confirm) {
      setMsg({ kind: "err", text: t.pf_mismatch });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setMsg({ kind: "ok", text: t.pf_ok });
        setCur("");
        setNext("");
        setConfirm("");
      } else {
        setMsg({ kind: "err", text: j.error || t.pf_err });
      }
    } catch {
      setMsg({ kind: "err", text: t.pf_conn });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
      <Field label={t.pf_current} value={cur} onChange={setCur} autoComplete="current-password" />
      <Field label={t.pf_new} value={next} onChange={setNext} autoComplete="new-password" />
      <Field label={t.pf_confirm} value={confirm} onChange={setConfirm} autoComplete="new-password" />

      {msg && (
        <div
          className="mono"
          style={{ fontSize: ".72rem", color: msg.kind === "ok" ? "var(--green-t)" : "var(--red-t)" }}
        >
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn btn-accent" style={{ padding: ".75rem", opacity: busy ? 0.6 : 1 }}>
        {busy ? t.pf_submitting : t.pf_submit}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span className="eyebrow" style={{ display: "block", marginBottom: 6 }}>{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        style={{
          width: "100%",
          padding: ".7rem .8rem",
          borderRadius: 9,
          border: "1px solid var(--card-border)",
          background: "var(--input-bg)",
          color: "var(--ink)",
          fontSize: ".9rem",
          outline: "none",
        }}
      />
    </label>
  );
}
