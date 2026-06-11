/**
 * useOnline — live navigator.onLine as React state. Drives the offline mode-locks: speech
 * recognition (the say_* modes) uses the browser's CLOUD recognizer, so it needs the network.
 *
 * Note `navigator.onLine === true` only means "some network interface is up" (a captive portal
 * still reads online) — so callers that depend on a remote service must ALSO handle that
 * service's own runtime errors (e.g. the recognizer's "network" error). The hook is the cheap
 * first gate, not the only one.
 */

import { useEffect, useState } from "react";

export function useOnline(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
