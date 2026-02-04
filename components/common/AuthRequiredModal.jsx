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
        pathname?.startsWith("/series") || pathname?.startsWith("/read");
      if (!allowAuto && source !== "event") {
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
      return;
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
      title="Sign in"
      description="Please sign in to continue."
      errorMessage={errorMessage}
    />
  );
}
