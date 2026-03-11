"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import InfoPageNav from "../layout/InfoPageNav";
import { apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import { siteConfig } from "../../lib/siteConfig";

function buildSupportBody(message, replyEmail, orderId) {
  const notes = [];
  if (replyEmail) {
    notes.push(`Reply email: ${replyEmail}`);
  }
  if (orderId) {
    notes.push(`Order ID: ${orderId}`);
  }
  if (notes.length === 0) {
    return message;
  }
  return `${notes.join("\n")}\n\n${message}`;
}

export default function SupportPage() {
  const { hydrated, isSignedIn, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    if (hydrated && isSignedIn) {
      setEmail(user?.email || "");
    }
  }, [hydrated, isSignedIn, user?.email]);

  const trimmedEmail = email.trim();
  const supportBody = useMemo(
    () => buildSupportBody(message.trim(), trimmedEmail, orderId.trim()),
    [message, trimmedEmail, orderId]
  );

  const handleSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    const trimmedOrderId = orderId.trim();

    if (!trimmedSubject || !trimmedMessage) {
      setFeedback({ type: "error", text: "Please fill in both subject and message." });
      return;
    }

    if (!hydrated && !trimmedEmail) {
      setFeedback({ type: "error", text: "Add a reply email so support can reach you if you are browsing as a guest." });
      return;
    }

    if (!isSignedIn && !trimmedEmail) {
      setFeedback({ type: "error", text: "Please add a reply email so support can reach you." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      if (!hydrated || !isSignedIn) {
        const mailto = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(
          trimmedSubject
        )}&body=${encodeURIComponent(buildSupportBody(trimmedMessage, trimmedEmail, trimmedOrderId))}`;
        if (typeof window !== "undefined") {
          window.location.href = mailto;
        }
        setFeedback({
          type: "success",
          text: `Your email draft is ready. If nothing opened, send the details to ${siteConfig.supportEmail}.`,
        });
        return;
      }

      const response = await apiPost("/api/support", {
        subject: trimmedSubject,
        message: supportBody,
      });

      if (response.ok) {
        setFeedback({
          type: "success",
          text: "Ticket submitted successfully. We usually reply within 1-2 business days.",
        });
        setSubject("");
        setOrderId("");
        setMessage("");
        setEmail(user?.email || trimmedEmail);
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
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-8">
        <InfoPageNav current="support" />
        <div>
          <h1 className="text-2xl font-semibold">Support</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Contact support, share account or billing context, and get a reply from a real person.
          </p>
        </div>
        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-neutral-500">Reply email</label>
                <input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  {hydrated && isSignedIn
                    ? "We prefill your account email, but you can change the best reply address."
                    : "Guests are handled by email. Add the inbox you want us to reply to."}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase text-neutral-500">Order ID (optional)</label>
                <input
                  id="support-order-id"
                  type="text"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="ord_12345"
                  className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

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
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue, what you expected to happen, and any steps you've already tried."
                className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : hydrated && isSignedIn ? "Submit Ticket" : "Email Support"}
              </button>
              {hydrated && !isSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("auth:open"));
                    }
                  }}
                  className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-300"
                >
                  Sign in for in-app tickets
                </button>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-5">
              <h2 className="text-sm font-semibold text-white">What to expect</h2>
              <ul className="mt-3 space-y-2 text-sm text-neutral-400">
                <li>We usually reply within 1-2 business days.</li>
                <li>Add an order ID for payment issues so we can trace the receipt faster.</li>
                <li>Signed-in users can submit tickets directly without leaving the site.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-5 text-sm text-neutral-400">
              <h2 className="text-sm font-semibold text-white">Direct contact</h2>
              <p className="mt-3">Email: {siteConfig.supportEmail}</p>
              <p className="mt-2">
                Include screenshots, browser/device details, and the page URL if the issue is visual.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
