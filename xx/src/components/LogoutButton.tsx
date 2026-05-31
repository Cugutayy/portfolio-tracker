"use client";

import { signOut } from "next-auth/react";

/** Signs the current user out and returns them to the landing page. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "btn"}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Çıkış
    </button>
  );
}
