"use client";

import SiteHeader from "../layout/SiteHeader";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";

export default function SupportPage() {
  const { isSignedIn } = useAuthStore();

  const handleSubmit = async () => {
    const subject = document.getElementById("support-subject")?.value || "";
    const message = document.getElementById("support-message")?.value || "";
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
      return;
    }
    const response = await apiPost("/api/support", { subject, message });
    if (typeof window !== "undefined") {
      if (response.ok) {
        window.alert("Ticket submitted. (Mock)");
      } else {
        window.alert(response.error || "Submit failed.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Support</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Submit a ticket and we will get back to you.
          </p>
        </div>
        <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
          <div>
            <label className="text-xs uppercase text-neutral-500">Subject</label>
            <input
              id="support-subject"
              type="text"
              placeholder="Billing issue / Account / Content"
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-neutral-500">Message</label>
            <textarea
              id="support-message"
              rows={5}
              placeholder="Describe your issue..."
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
          >
            Submit Ticket
          </button>
        </section>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
          Prefer email? support@tappytoon.local (mock)
        </div>
      </main>
    </div>
  );
}
