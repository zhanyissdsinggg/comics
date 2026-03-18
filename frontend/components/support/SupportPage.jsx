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
  { id: "refund", label: "Refund request", subject: "Refund request" },
  { id: "account", label: "Sign-in help", subject: "Sign-in help" },
  { id: "reader", label: "Reader issue", subject: "Reader issue" },
  { id: "adult", label: "Age-check help", subject: "Mature content access" },
  { id: "content", label: "Content report", subject: "Content report" },
];

const SUPPORT_CATEGORIES = [
  {
    title: "Billing & refunds",
    description: "Wrong charge, duplicate payment, missing points, refund eligibility, or receipt questions.",
  },
  {
    title: "Account & sign-in",
    description: "Email verification, password reset, social sign-in, or account access problems.",
  },
  {
    title: "Reader & content",
    description: "Broken reader pages, missing chapters, cover issues, translation problems, or title reports.",
  },
  {
    title: "Mature content",
    description: "18+ access, age check, hidden titles, region settings, or Hide 18+ history questions.",
  },
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
    if (typeof window === "undefined") {
      return;
    }

    const seededOrderId = new URLSearchParams(window.location.search).get("orderId")?.trim();
    if (!seededOrderId) {
      return;
    }

    setOrderId((current) => current || seededOrderId);
  }, []);

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

  const openGuestMailApp = () => {
    if (!canPrepareGuestEmail) {
      setFeedback({ type: "error", text: "Please add both a subject and a message." });
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
      setFeedback({ type: "error", text: "Please add both a subject and a message." });
      return false;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(draft);
        setFeedback({
          type: "success",
          text: `Draft copied. Paste it into an email to ${siteConfig.supportEmail}, or use Open mail app.`,
        });
        return true;
      }
    } catch {
      // fall through to the fallback message below
    }

    setFeedback({
      type: "success",
      text: `Your message is ready. Send it to ${siteConfig.supportEmail}, or use Open mail app if your device supports it.`,
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!trimmedSubject || !trimmedMessage) {
      setFeedback({ type: "error", text: "Please add both a subject and a message." });
      return;
    }

    if (!hydrated && !trimmedEmail) {
      setFeedback({
        type: "error",
        text: "Add a reply email so we know where to answer.",
      });
      return;
    }

    if (!isSignedIn && !trimmedEmail) {
      setFeedback({ type: "error", text: "Please add a reply email so we know where to answer." });
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
          text: "Message sent. We usually reply within 1 to 2 business days.",
        });
        setSubject("");
        setOrderId("");
        setMessage("");
        setEmail(user?.email || trimmedEmail);
        return;
      }

      setFeedback({ type: "error", text: response.error || "Could not send your message." });
    } catch {
      setFeedback({ type: "error", text: "Could not send your message. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative mx-auto max-w-[1280px] space-y-6 px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <InfoPageNav current="support" appearance="light" />
        <EditorialHero
          eyebrow="Support"
          title="Billing, account, and reader help."
          description="Tell us what happened, how to reach you, and any order ID or page URL that helps us find the problem faster."
          secondary="Most replies arrive within 1 to 2 business days. Signed-in readers can send a message here. Guests can copy an email draft or open their mail app."
          appearance="light"
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {SUPPORT_CATEGORIES.map((item) => (
            <SurfacePanel key={item.title} appearance="light" accent="blue">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Category
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </SurfacePanel>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Send a message
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                What happened?
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                A short note works best. Tell us what broke, what you expected, and where it happened.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Common topics
              </p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_TOPIC_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSubject(preset.subject)}
                    className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
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
                    ? "border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] text-slate-700"
                    : "border-red-200 bg-red-50 text-red-600",
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
                <p className="mt-2 text-xs text-slate-500">
                  {hydrated && isSignedIn
                    ? "We filled in your account email, but you can change it if another inbox is better."
                    : "If you are not signed in, add the inbox you want us to reply to."}
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
                placeholder="Charge issue / Sign-in help / Reader bug"
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
                placeholder="Tell us what happened, what you expected, and any steps you already tried."
                className={fieldClass}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className={primaryButtonClass}
              >
                {submitting ? "Sending..." : hydrated && isSignedIn ? "Send message" : "Copy email draft"}
              </button>
              {!isSignedIn ? (
                <button
                  type="button"
                  onClick={openGuestMailApp}
                  disabled={!canPrepareGuestEmail}
                  className={secondaryButtonClass}
                >
                  Open mail app
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
                  Sign in to send here
                </button>
              ) : null}
            </div>
          </SurfacePanel>

          <div className="space-y-4">
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  What to include
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  A few details help a lot.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-slate-600">
                <li>We usually reply within 1 to 2 business days.</li>
                <li>Add the order ID if this is about a charge, points, or a renewal.</li>
                <li>Include the page URL, title name, and the device or browser if something looks broken.</li>
                <li>Screenshots help, especially for reader bugs, billing screens, and 18+ access problems.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Fast links
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Answers you may want before you write in.
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/faq")}
                  className={primaryButtonClass}
                >
                  FAQ
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/how-it-works")}
                  className={secondaryButtonClass}
                >
                  How it works
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/mature-content")}
                  className={secondaryButtonClass}
                >
                  Mature content
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className={secondaryButtonClass}
                >
                  View purchases
                </button>
              </div>
              <p className="text-sm text-slate-500">Direct email: {siteConfig.supportEmail}</p>
            </SurfacePanel>
          </div>
        </div>
      </main>
    </div>
  );
}
