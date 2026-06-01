"use client";

import { signOut } from "next-auth/react";
import { useT } from "./Providers";

/** Signs the current user out and returns them to the landing page. */
export function LogoutButton({ className }: { className?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      className={className ?? "btn"}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      {t.nav_logout}
    </button>
  );
}
