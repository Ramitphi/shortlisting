"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDb } from "@/lib/db";
import { setSessionUid } from "@/lib/session";
import { roleHome, type Role } from "@/lib/domain";

/**
 * Dev-only fast door: /dev-login?email=…&next=… signs straight in. Used by
 * headless captures and quick role hopping. It is a page rather than a route
 * handler now — the session and the database both live in the browser, so
 * only the browser can sign anyone in.
 */
function DevLogin() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const email = params.get("email");
    const next = params.get("next");
    if (!email) {
      router.replace("/login");
      return;
    }
    const user = getDb()
      .prepare("SELECT id, role FROM users WHERE email = ?")
      .get(email) as { id: number; role: Role } | undefined;
    if (!user) {
      router.replace("/login");
      return;
    }
    setSessionUid(user.id);
    router.replace(next || roleHome(user.role));
  }, [params, router]);

  return null;
}

export default function DevLoginPage() {
  return (
    <Suspense fallback={null}>
      <DevLogin />
    </Suspense>
  );
}
