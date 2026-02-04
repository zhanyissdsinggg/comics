import { useEffect, useRef } from "react";
import { emitAuthRequired } from "../lib/authBus";

export function useAuthOpenListener() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    const handler = () => {
      emitAuthRequired({ source: "event" });
    };
    window.addEventListener("auth:open", handler);
    return () => {
      window.removeEventListener("auth:open", handler);
    };
  }, []);
}
