"use client";

import { useEffect, useState } from "react";

/**
 * The honest offline state for an app whose data lives on the device.
 *
 * Once loaded, nothing here needs the network — every read and write is
 * local — so going offline is not a failure, and a full-page block would be
 * a lie. What the person needs is to be told, once, that they are working
 * locally, and told again when they are back. A reload while offline is the
 * browser's own screen; that one is out of our hands without a service
 * worker, and the FAB previewer shows the full-page design for that day.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOffline(!navigator.onLine);
    const down = () => {
      setOffline(true);
      setRestored(false);
    };
    const up = () => {
      setOffline(false);
      setRestored(true);
      window.setTimeout(() => setRestored(false), 4000);
    };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, []);

  if (!offline && !restored) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[120] flex items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium ${
        offline
          ? "border-b border-[#ecdfc0] bg-[#f6efdd] text-[#8a6d2f]"
          : "border-b border-[#d5e6d8] bg-[#e8f2e9] text-[#3f6c45]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-[#8a6d2f]" : "bg-[#3f6c45]"}`}
      />
      {offline
        ? "You're offline — everything here still works, and your changes stay on this device."
        : "Back online."}
    </div>
  );
}
