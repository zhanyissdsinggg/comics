import { useEffect, useRef } from "react";
import { emitAuthRequired } from "../lib/authBus";

export function useAuthOpenListener() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const handler = (event) => {
      const returnTo = event?.detail?.returnTo || null;
      if (typeof window !== "undefined") {
        if (returnTo) {
          window.sessionStorage.setItem("mn_return_to", returnTo);
        }
        const handledAt = Number(window.__mnAuthModalHandledAt || 0);
        if (handledAt && Date.now() - handledAt < 250) {
          return;
        }
      }
      if (event?.__mnAuthHandled) {
        return;
      }
      emitAuthRequired({
        source: "event",
        returnTo,
      });
    };

    window.addEventListener("auth:open", handler);
    return () => {
      window.removeEventListener("auth:open", handler);
    };
  }, []);
}
