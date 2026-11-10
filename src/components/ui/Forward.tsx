"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends an old address to its new one, keeping ?id=…&page=… (works on a static host too). */
export function Forward({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`${to}${window.location.search}`);
  }, [router, to]);
  return null;
}
