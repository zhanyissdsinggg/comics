"use client";

import { useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";

export default function SupportPage() {
  const { isSignedIn } = useAuthStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const handleSubmit = async () => {
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:open"));
      }
      return;
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      setFeedback({ type: "error", text: "Please fill in both subject and message." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const response = await apiPost("/api/support", {
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      if (response.ok) {
        setFeedback({ type: "success", text: "Ticket submitted successfully." });
        setSubject("");
        setMessage("");
        return;
      }

      setFeedback({ type: "error", text: response.error || "Submit failed." });
    } catch {
      setFeedback({ type: "error", text: "Submit failed. Please try again." });
    } finally {
      setSubmitting(false);
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
          {feedback.text ? (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {feedback.text}
            </div>
          ) : null}

          <div>
            <label className="text-xs uppercase text-neutral-500">Subject</label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Billing issue / Account / Content"
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-neutral-500">Message</label>
            <textarea
              id="support-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your issue..."
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Ticket"}
          </button>
        </section>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
          Prefer email? support@gush.local (mock)
        </div>
      </main>
    </div>
  );
}
