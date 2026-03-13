"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../layout/SiteHeader";
import InfoPageNav from "../layout/InfoPageNav";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
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
    [message, trimmedEmail, orderId],
  );

  const supportStats = useMemo(
    () => [
      {
        label: "Channel",
        value: hydrated && isSignedIn ? "In-app" : "Email",
        hint: hydrated && isSignedIn ? "Signed-in users can submit tickets directly." : "Guests fall back to their mail client.",
      },
      {
        label: "Reply SLA",
        value: "1-2 days",
        hint: "Current support expectation for standard issues.",
      },
      {
        label: "Contact",
        value: siteConfig.supportEmail,
        hint: "Direct email inbox for support escalation.",
      },
      {
        label: "Order Ref",
        value: orderId.trim() ? "Attached" : "Optional",
        hint: "Adding a receipt reference speeds up billing triage.",
      },
    ],
    [hydrated, isSignedIn, orderId],
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
      setFeedback({
        type: "error",
        text: "Add a reply email so support can reach you if you are browsing as a guest.",
      });
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
        const mailto = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(buildSupportBody(trimmedMessage, trimmedEmail, trimmedOrderId))}`;
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

  const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";
  const secondaryButtonClass =
    "rounded-full border border-white/10 bg-black/10 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10";

  return (
    <div className="min-h-screen bg-transparent text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <InfoPageNav current="support" />
        <EditorialHero
          eyebrow="Support desk"
          title="Send billing, account, and reading issues through a cleaner support console."
          description="Support now sits inside the same visual system as the rest of the site while preserving direct email fallback for guests and in-app ticket submission for signed-in users."
          secondary="Add reply context, include an order reference when needed, and keep the expectation window visible before you submit."
          stats={supportStats}
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfacePanel className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Ticket form
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                Submit issue details
              </h2>
            </div>

            {feedback.text ? (
              <div
                className={[
                  "rounded-[24px] border px-4 py-3 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/30 bg-red-500/10 text-red-200",
                ].join(" ")}
              >
                {feedback.text}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>Reply email</label>
                <input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className={fieldClass}
                />
                <p className="mt-2 text-xs text-neutral-500">
                  {hydrated && isSignedIn
                    ? "We prefill your account email, but you can change the best reply address."
                    : "Guests are handled by email. Add the inbox you want us to reply to."}
                </p>
              </div>
              <div>
                <label className={fieldLabelClass}>Order ID</label>
                <input
                  id="support-order-id"
                  type="text"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  placeholder="ord_12345"
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={fieldLabelClass}>Subject</label>
              <input
                id="support-subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Billing issue / Account / Content"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>Message</label>
              <textarea
                id="support-message"
                rows={7}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the issue, what you expected to happen, and any steps you already tried."
                className={fieldClass}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className={secondaryButtonClass}
                >
                  Sign in for in-app tickets
                </button>
              ) : null}
            </div>
          </SurfacePanel>

          <div className="space-y-6">
            <SurfacePanel className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                What to expect
              </p>
              <ul className="space-y-3 text-sm leading-6 text-neutral-300">
                <li>We usually reply within 1-2 business days.</li>
                <li>Add an order ID for payment issues so the receipt can be traced faster.</li>
                <li>Signed-in users can submit tickets directly without leaving the site.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Direct contact
              </p>
              <p className="text-sm text-neutral-300">Email: {siteConfig.supportEmail}</p>
              <p className="text-sm leading-6 text-neutral-400">
                Include screenshots, browser or device details, and the page URL when the issue is visual.
              </p>
            </SurfacePanel>
          </div>
        </div>
      </main>
    </div>
  );
}
