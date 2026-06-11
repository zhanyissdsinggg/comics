import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoginGateModal from "../layout/LoginGateModal";
import { subscribeAuthRequired } from "../../lib/authBus";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthRequiredModal() {
  const { signIn } = useAuthStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setOpen(false);
      setErrorMessage("");
      return undefined;
    }

    return subscribeAuthRequired((payload) => {
      const source = payload?.source || "";
      const allowAuto =
        pathname?.startsWith("/series") ||
        pathname?.startsWith("/read") ||
        pathname?.startsWith("/library") ||
        pathname?.startsWith("/interactive");
      const hasSiteHeader =
        typeof document !== "undefined" &&
        Boolean(document.querySelector('[data-site-header="1"]'));

      if (source === "event" && hasSiteHeader) {
        return;
      }
      if (!allowAuto && source !== "event" && source !== "api") {
        return;
      }
      setOpen(true);
    });
  }, [pathname]);

  const handleSubmit = async ({ email, password, mode }) => {
    const response = await signIn(email, password, mode);
    if (response?.status === 202) {
      setErrorMessage("");
      return response;
    }

    if (response.ok) {
      setOpen(false);
      setErrorMessage("");
      if (typeof window !== "undefined") {
        const returnTo = window.sessionStorage.getItem("mn_return_to");
        if (returnTo) {
          window.sessionStorage.removeItem("mn_return_to");
          window.location.href = returnTo;
          return response;
        }
      }
      return response;
    }

    setErrorMessage("Invalid email or password.");
    return response;
  };

  return (
    <LoginGateModal
      open={open}
      onClose={() => {
        setOpen(false);
        setErrorMessage("");
      }}
      onSubmit={handleSubmit}
      allowRegister
      errorMessage={errorMessage}
    />
  );
}
