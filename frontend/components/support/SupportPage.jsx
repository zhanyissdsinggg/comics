"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import EditorialHero from "../common/EditorialHero";
import NetworkFallback from "../common/NetworkFallback";
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
import {
  getSupportTopicPreset,
  SUPPORT_TOPICS,
} from "../../lib/supportRouting";

function buildSupportBody(message, topicLabel, replyEmail, orderId) {
  const notes = [];
  if (topicLabel) {
    notes.push(`Issue type: ${topicLabel}`);
  }
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isAutofilledSupportMessage(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("Context:")) {
    return true;
  }

  return SUPPORT_TOPICS.some((preset) => String(preset?.draft || "").trim() === trimmed);
}

export default function SupportPage() {
  const router = useRouter();
  const { hydrated, isSignedIn, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "", mode: "inline" });
  const [successState, setSuccessState] = useState(null);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const orderIdInputRef = useRef(null);
  const lastRequestRef = useRef(null);
  const signedInReader = hydrated && isSignedIn;
  const activePreset = useMemo(() => getSupportTopicPreset(activeTopic), [activeTopic]);
  const quickIssueCards = [
    {
      id: "billing",
      label: "Billing",
      topic: "billing",
      subject: "Billing issue",
      context: "A charge, receipt, refund, or point pack does not look right.",
    },
    {
      id: "login",
      label: "Login",
      topic: "login",
      subject: "Login help",
      context: "I cannot sign in, verify my email, or access the right account.",
    },
    {
      id: "subscription",
      label: "Subscription",
      topic: "subscription",
      subject: "Membership help",
      context: "A membership charge, renewal, or included access looks wrong.",
    },
    {
      id: "content",
      label: "Content issue",
      topic: "content",
      subject: "Content report",
      context: "A title page, chapter, cover, or metadata entry needs review.",
    },
    {
      id: "technical",
      label: "Technical issue",
      topic: "technical",
      subject: "Technical issue",
      context: "A page, reader, or purchase screen is broken or not loading.",
    },
  ];

  useEffect(() => {
    if (hydrated && isSignedIn) {
      setEmail(user?.email || "");
    }
  }, [hydrated, isSignedIn, user?.email]);

  const applyTopicPreset = (preset, { preserveMessage = false, forceSubject = false } = {}) => {
    if (!preset) {
      return;
    }

    setActiveTopic(preset.id);
    setSubject((current) => {
      if (!forceSubject && current.trim()) {
        return current;
      }
      return preset.subject || "";
    });
    if (!preserveMessage) {
      setMessage((current) => {
        if (!isAutofilledSupportMessage(current)) {
          return current;
        }
        return preset.draft || "";
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const seededOrderId = params.get("orderId")?.trim();
    const seededTopic = params.get("topic")?.trim();
    const seededSubject = params.get("subject")?.trim();
    const seededMessage = params.get("message")?.trim();
    const seededContext = params.get("context")?.trim();
    const preset = getSupportTopicPreset(seededTopic);

    if (seededOrderId) {
      setOrderId((current) => current || seededOrderId);
    }

    if (preset) {
      setActiveTopic(preset.id);
      setSubject((current) => current || preset.subject || "");
    }

    if (seededSubject) {
      setSubject((current) => current || seededSubject);
    }

    if (seededContext || seededMessage) {
      setMessage((current) => {
        if (current) {
          return current;
        }

        const segments = [];
        if (preset?.draft) {
          segments.push(preset.draft);
        }
        if (seededContext) {
          segments.push(`Context: ${seededContext}`);
        }
        if (seededMessage) {
          segments.push(seededMessage);
        }
        return segments.filter(Boolean).join("\n\n");
      });
    }
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
  const trimmedOrderId = orderId.trim();
  const supportBody = useMemo(
    () => buildSupportBody(trimmedMessage, activePreset?.title || activePreset?.label, trimmedEmail, trimmedOrderId),
    [activePreset?.label, activePreset?.title, trimmedEmail, trimmedMessage, trimmedOrderId],
  );

  const resetForAnotherRequest = () => {
    setFeedback({ type: "", text: "", mode: "inline" });
    setSuccessState(null);
    lastRequestRef.current = null;
    setSubject("");
    setOrderId("");
    setMessage("");
    setActiveTopic("");
    if (signedInReader) {
      setEmail(user?.email || "");
      return;
    }
    setEmail(trimmedEmail);
  };

  const submitSupportRequest = async ({ payload, successMeta }) => {
    setSubmitting(true);
    setFeedback({ type: "", text: "", mode: "inline" });
    setSuccessState(null);
    lastRequestRef.current = { payload, successMeta };

    try {
      const response = await apiPost("/api/support", payload);

      if (response.ok) {
        setSuccessState({
          replyEmail: successMeta.replyEmail,
          topicLabel: successMeta.topicLabel,
          signedInReader: successMeta.signedInReader,
        });
        lastRequestRef.current = null;
        setSubject("");
        setOrderId("");
        setMessage("");
        setActiveTopic("");
        return;
      }

      setFeedback({
        type: "error",
        text: response.error || "Could not send your request.",
        mode: "network",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Could not send your request. Please try again.",
        mode: "network",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activePreset) {
      setFeedback({ type: "error", text: "Choose an issue type so we can route this faster.", mode: "inline" });
      return;
    }

    if (!trimmedEmail) {
      setFeedback({ type: "error", text: "Add the best reply email so we know where to answer.", mode: "inline" });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFeedback({ type: "error", text: "Enter a valid reply email address.", mode: "inline" });
      return;
    }

    if (!trimmedSubject || !trimmedMessage) {
      setFeedback({ type: "error", text: "Please add both a subject and a message.", mode: "inline" });
      return;
    }

    await submitSupportRequest({
      payload: {
        topic: activePreset.id,
        replyEmail: trimmedEmail,
        orderId: trimmedOrderId || undefined,
        subject: trimmedSubject,
        message: supportBody,
      },
      successMeta: {
        replyEmail: trimmedEmail,
        topicLabel: activePreset.title,
        signedInReader,
      },
    });
  };

  const retrySupportRequest = () => {
    if (submitting || !lastRequestRef.current) {
      return;
    }
    void submitSupportRequest(lastRequestRef.current);
  };

  const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500";
  const fieldClass =
    "mt-2 w-full rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";
  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="gush-page-shell">
      <div className="gush-page-ambient" />
      <SiteHeader variant="light" />
      <main className="gush-page-main gush-section-stack">
        <EditorialHero
          eyebrow="Support"
          title="Get help."
          description="Pick the issue and tell us what happened."
          appearance="light"
        />

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <SurfacePanel className="space-y-4" appearance="light" accent="blue">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Quick start
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
              Choose the issue.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickIssueCards.map((item) => {
              const isActive = activeTopic === item.topic;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const preset = getSupportTopicPreset(item.topic);
                    applyTopicPreset(preset, { preserveMessage: true, forceSubject: true });
                    setSubject(item.subject);
                    setMessage((current) =>
                      isAutofilledSupportMessage(current) ? `Context: ${item.context}` : current,
                    );
                    setFeedback({ type: "", text: "", mode: "inline" });
                    setSuccessState(null);
                  }}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.08)] text-[var(--gush-accent,#2f6bff)]"
                      : "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </SurfacePanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            {successState ? (
              <div className="space-y-5">
                <div className="rounded-[28px] border border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gush-accent,#2f6bff)]">
                    Request received
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">
                    We have your request.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    We will reply at <span className="font-semibold text-slate-900">{successState.replyEmail}</span> within 1 to 2 business days. For billing or membership questions, keep the order ID and affected page handy.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Routed as
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{successState.topicLabel}</p>
                  </div>
                  <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Reply path
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {successState.signedInReader ? "Account + email context" : "Email reply"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-black/8 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Next step
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">Watch your inbox</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={resetForAnotherRequest}
                    className={primaryButtonClass}
                  >
                    Send Request
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/orders")}
                    className={secondaryButtonClass}
                  >
                    View purchases
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/faq")}
                    className={secondaryButtonClass}
                  >
                    Browse FAQ
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Send a request
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Send a request.
                  </h2>
                  <p className="text-sm leading-6 text-slate-500">
                    We usually reply in 1 to 2 business days.
                  </p>
                </div>

                {feedback.text ? (
                  feedback.type === "error" && feedback.mode === "network" ? (
                    <NetworkFallback
                      compact
                      showIllustration={false}
                      className="px-0 py-0"
                      cardClassName="max-w-none rounded-[24px] px-4 py-4 sm:px-5 sm:py-5"
                      title="Oops! Your support request hit a network snag."
                      description={`${feedback.text} Your message is still here, so you can try again.`}
                      onRetry={retrySupportRequest}
                    />
                  ) : (
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
                  )
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-topic" className={fieldLabelClass}>
                      Issue type
                    </label>
                    <select
                      id="support-topic"
                      value={activeTopic}
                      onChange={(event) => {
                        const nextPreset = getSupportTopicPreset(event.target.value);
                        setSuccessState(null);
                        applyTopicPreset(nextPreset, { forceSubject: true });
                      }}
                      className={fieldClass}
                    >
                      <option value="">Choose an issue type</option>
                      {SUPPORT_TOPICS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-email" className={fieldLabelClass}>
                      Reply email
                    </label>
                    <input
                      id="support-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-order-id" className={fieldLabelClass}>
                      Order ID
                    </label>
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

                  <div>
                    <label htmlFor="support-subject" className={fieldLabelClass}>
                      Subject
                    </label>
                    <input
                      id="support-subject"
                      type="text"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Billing issue / Login help / Technical issue"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="support-message" className={fieldLabelClass}>
                    Message
                  </label>
                  <textarea
                    id="support-message"
                    rows={7}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what happened, what you expected, and any page URL, title, or episode number that helps us find it faster."
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={submitting} className={primaryButtonClass}>
                    {submitting ? "Sending..." : "Send Request"}
                  </button>
                  {!signedInReader ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("auth:open"));
                        }
                      }}
                      className={secondaryButtonClass}
                    >
                      Sign in instead
                    </button>
                  ) : null}
                </div>
              </form>
            )}
          </SurfacePanel>

          <div className="space-y-4">
            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Before you send
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Include the useful details.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-slate-600">
                <li>Add the order ID for charges, receipts, points, or renewals.</li>
                <li>Include the title, episode number, or page URL if something looks broken.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-4" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Fast links
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Check these first.
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
                  onClick={() => router.push("/orders")}
                  className={secondaryButtonClass}
                >
                  View purchases
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/how-it-works")}
                  className={secondaryButtonClass}
                >
                  How it works
                </button>
              </div>
              <p className="text-xs text-slate-500">Backup email: {siteConfig.supportEmail}</p>
            </SurfacePanel>
          </div>
        </div>
      </main>
    </div>
  );
}
