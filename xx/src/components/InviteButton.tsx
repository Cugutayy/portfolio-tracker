"use client";

import { useState } from "react";
import { useT } from "./Providers";

/** Shares/copies the competition invite link (/yarisma — which previews the
 *  newspaper poster). Web Share on mobile, clipboard copy on desktop. */
export function InviteButton({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  const t = useT();
  const [done, setDone] = useState(false);

  async function go() {
    const url = `${window.location.origin}/yarisma`;
    const text =
      "XX Arena’da 3 aylık trader turnuvası başladı. 1.000.000 ₺ sanal portföyle yarış, ilk 3’e sürpriz para ödülü. Katıl:";
    try {
      if (navigator.share) {
        await navigator.share({ title: "XX Arena", text, url });
        return;
      }
    } catch {
      /* dismissed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <button type="button" className={className ?? "btn"} onClick={go}>
      {done ? t.copied : label ?? t.invite_friend}
    </button>
  );
}
