"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthRedirectPage from "../../components/auth/AuthRedirectPage";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/?openLogin=1");
  }, [router]);

  return <AuthRedirectPage title="Opening sign in" description="You'll be back to reading in a moment." />;
}
