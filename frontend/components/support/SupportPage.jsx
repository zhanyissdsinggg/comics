"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import InfoPageNav from "../layout/InfoPageNav";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import { apiPost } from "../../lib/apiClient";
import {
  consumeCommerceSuccessForPath,
  getCommerceSuccessPresentation,
} from "../../lib/commerceSuccess";
import { focusInteractiveTarget } from "../../lib/focusTarget";
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

function buildSupportDraft(subject, body, supportEmail) {
  return `To: ${supportEmail}\nSubject: ${subject}\n\n${body}`;
}

const SUPPORT_TOPIC_PRESETS = [
  { id: "billing", label: "Billing issue", subject: "Billing issue" },
  { id: "refund", label: "Refund follow-up", subject: "Refund follow-up" },
  { id: "account", label: "Account access", subject: "Account access" },
  { id: "reader", label: "Reader bug", subject: "Reader bug" },
  { id: "content", label: "Content report", subject: "Content report" },
];

export default function SupportPage() {
  const router = useRouter();
  const { hydrated, isSignedIn, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [commerceNotice, setCommerceNotice] = useState(null);
  const orderIdInputRef = useRef(null);

  useEffect(() => {
    if (hydrated && isSignedIn) {
      setEmail(user?.email || "");
    }
  }, [hydrated, isSignedIn, user?.email]);

  useEffect(() => {
    setCommerceNotice(getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/support")));
  }, []);

  useEffect(() => {
    if (!commerceNotice) {
      return undefined;
    }

    return focusInteractiveTarget(orderIdInputRef);
  }, [commerceNotice]);

  const trimmedEmail = email.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const supportBody = useMemo(
    () => buildSupportBody(trimmedMessage, trimmedEmail, orderId.trim()),
    [trimmedEmail, trimmedMessage, orderId],
  );
  const canPrepareGuestEmail = Boolean(trimmedSubject && trimmedMessage);

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

  const openGuestMailApp = () => {
    if (!canPrepareGuestEmail) {
      setFeedback({ type: "error", text: "Please fill in both subject and message." });
      return;
    }

    const mailto = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(trimmedSubject)}&body=${encodeURIComponent(supportBody)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
  };

  const copyGuestDraft = async () => {
    const draft = buildSupportDraft(trimmedSubject, supportBody, siteConfig.supportEmail);
    if (!canPrepareGuestEmail) {
      setFeedback({ type: "error", text: "Please fill in both subject and message." });
      return false;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft);
        setFeedback({
          type: "success",
          text: `Support details copied. Paste them into an email to ${siteConfig.supportEmail}, or use the Open email app button.`,
        });
        return true;
      }
    } catch {
      // fall through to the fallback message below
    }

    setFeedback({
      type: "success",
      text: `Your message is ready. Send it to ${siteConfig.supportEmail}, or use the Open email app button if your device supports it.`,
    });
    return true;
  };

  const handleSubmit = async () => {
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
        await copyGuestDraft();
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
          eyebrow="Support"
          title="Support"
          description="Get help with billing, account, or reading issues."
          secondary="Send a support request here, or use email if you are browsing as a guest. Add a reply address, include an order ID when it helps, and keep the details in one clear message."
          stats={supportStats}
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SurfacePanel className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
                Ticket form
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
                Tell us what happened
              </h2>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                Quick topics
              </p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_TOPIC_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSubject(preset.subject)}
                    className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
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
                  ref={orderIdInputRef}
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
                {submitting ? "Submitting..." : hydrated && isSignedIn ? "Send ticket" : "Copy email details"}
              </button>
              {!isSignedIn ? (
                <button
                  type="button"
                  onClick={openGuestMailApp}
                  disabled={!canPrepareGuestEmail}
                  className={secondaryButtonClass}
                >
                  Open email app
                </button>
              ) : null}
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
                  Sign in to send in app
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
                Billing help
              </p>
              <p className="text-sm leading-6 text-neutral-300">
                Start from Orders when you need a receipt, payment status, or refund reference. Then use Support if the issue still needs a person to review it.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-200"
                >
                  View orders
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/faq")}
                  className={secondaryButtonClass}
                >
                  FAQ
                </button>
              </div>
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
