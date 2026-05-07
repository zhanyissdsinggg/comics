"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EditorialHero from "../common/EditorialHero";
import SurfacePanel from "../common/SurfacePanel";
import CommerceSuccessBanner from "../common/CommerceSuccessBanner";
import {
  StorefrontInfoCard,
  StorefrontSectionHeading,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../common/StorefrontPagePrimitives";
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

const EXPECTED_REPLY_TIME = "1-2 business days";

function buildSupportBody(message, topicLabel, replyEmail, orderId) {
  const notes = [];
  if (topicLabel) {
    notes.push(`Topic: ${topicLabel}`);
  }
  if (replyEmail) {
    notes.push(`Reply email: ${replyEmail}`);
  }
  if (orderId) {
    notes.push(`Order: ${orderId}`);
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

  return SUPPORT_TOPICS.some(
    (preset) => String(preset?.draft || "").trim() === trimmed,
  );
}

function shouldUseMailtoFallback(response) {
  if (!response || response.ok) {
    return false;
  }

  return (
    response.status === 0 ||
    response.status === 404 ||
    response.status === 405 ||
    response.status >= 500
  );
}

function buildMailtoHref({ replyEmail, subject, message, orderId, topicLabel }) {
  const lines = [];
  if (topicLabel) {
    lines.push(`Issue type: ${topicLabel}`);
  }
  if (replyEmail) {
    lines.push(`Reply email: ${replyEmail}`);
  }
  if (orderId) {
    lines.push(`Order ID: ${orderId}`);
  }
  lines.push("");
  lines.push(message);

  const params = new URLSearchParams({
    subject,
    body: lines.join("\n"),
  });

  return `mailto:${siteConfig.supportEmail}?${params.toString()}`;
}

export default function SupportPage() {
  const { hydrated, isSignedIn, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [successState, setSuccessState] = useState(null);
  const [commerceNotice, setCommerceNotice] = useState(null);
  const orderIdInputRef = useRef(null);

  const signedInReader = hydrated && isSignedIn;
  const activePreset = useMemo(
    () => getSupportTopicPreset(activeTopic),
    [activeTopic],
  );

  useEffect(() => {
    if (hydrated && isSignedIn && user?.email) {
      setEmail(user.email);
    }
  }, [hydrated, isSignedIn, user?.email]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const seededTopic = params.get("topic")?.trim();
    const seededOrderId = params.get("orderId")?.trim();
    const seededSubject = params.get("subject")?.trim();
    const seededMessage = params.get("message")?.trim();
    const seededContext = params.get("context")?.trim();
    const preset = getSupportTopicPreset(seededTopic);

    if (preset) {
      setActiveTopic(preset.id);
      setSubject((current) => current || preset.subject || "");
      setMessage((current) => {
        if (current) {
          return current;
        }

        const parts = [];
        if (preset.draft) {
          parts.push(preset.draft);
        }
        if (seededContext) {
          parts.push(`Context: ${seededContext}`);
        }
        if (seededMessage) {
          parts.push(seededMessage);
        }
        return parts.filter(Boolean).join("\n\n");
      });
    }

    if (seededOrderId) {
      setOrderId((current) => current || seededOrderId);
    }

    if (seededSubject) {
      setSubject((current) => current || seededSubject);
    }

    if (!preset && (seededContext || seededMessage)) {
      setMessage((current) => {
        if (current) {
          return current;
        }

        const parts = [];
        if (seededContext) {
          parts.push(`Context: ${seededContext}`);
        }
        if (seededMessage) {
          parts.push(seededMessage);
        }
        return parts.join("\n\n");
      });
    }
  }, []);

  useEffect(() => {
    setCommerceNotice(
      getCommerceSuccessPresentation(consumeCommerceSuccessForPath("/support")),
    );
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
    () =>
      buildSupportBody(
        trimmedMessage,
        activePreset?.title || "",
        trimmedEmail,
        trimmedOrderId,
      ),
    [activePreset?.title, trimmedEmail, trimmedMessage, trimmedOrderId],
  );

  const supportMailtoHref = useMemo(
    () =>
      buildMailtoHref({
        replyEmail: trimmedEmail,
        subject: trimmedSubject || "Support request",
        message:
          trimmedMessage || "I need help with my account or reading issue.",
        orderId: trimmedOrderId,
        topicLabel: activePreset?.title || "",
      }),
    [
      activePreset?.title,
      trimmedEmail,
      trimmedMessage,
      trimmedOrderId,
      trimmedSubject,
    ],
  );

  const resetForm = () => {
    setFeedback({ type: "", text: "" });
    setSuccessState(null);
    setSubject("");
    setOrderId("");
    setMessage("");
    setActiveTopic("");
    if (!signedInReader) {
      return;
    }
    setEmail(user?.email || "");
  };

  const handleMailtoFallback = ({
    payload,
    reason = "Email backup is ready. Open your email app to send this message.",
  }) => {
    const href = buildMailtoHref({
      replyEmail: payload.replyEmail,
      subject: payload.subject,
      message: payload.message,
      orderId: payload.orderId,
      topicLabel: activePreset?.title || "",
    });

    setSuccessState({
      mode: "mailto",
      replyEmail: payload.replyEmail,
      topicLabel: activePreset?.title || "",
      mailtoHref: href,
      message: reason,
    });

    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activePreset) {
      setFeedback({ type: "error", text: "Choose an issue type." });
      return;
    }

    if (!trimmedEmail) {
      setFeedback({
        type: "error",
        text: signedInReader
          ? "Add a reply email."
          : "Reply email is required.",
      });
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setFeedback({ type: "error", text: "Enter a valid email." });
      return;
    }

    if (!trimmedSubject) {
      setFeedback({ type: "error", text: "Add a subject." });
      return;
    }

    if (!trimmedMessage) {
      setFeedback({ type: "error", text: "Add a message." });
      return;
    }

    const payload = {
      topic: activePreset.id,
      replyEmail: trimmedEmail,
      orderId: trimmedOrderId || undefined,
      subject: trimmedSubject,
      message: supportBody,
    };

    setSubmitting(true);
    setFeedback({ type: "", text: "" });
    setSuccessState(null);

    try {
      const response = await apiPost("/api/support", payload);

      if (response.ok) {
        setSuccessState({
          mode: "submitted",
          replyEmail: trimmedEmail,
          topicLabel: activePreset.title,
        });
        setSubject("");
        setOrderId("");
        setMessage("");
        setActiveTopic("");
        return;
      }

      if (shouldUseMailtoFallback(response)) {
        handleMailtoFallback({
          payload,
          reason:
            "The support form is offline right now. Open your email app and send this message instead.",
        });
        return;
      }

      setFeedback({
        type: "error",
        text: response.error || "Couldn't send that. Try again or email support.",
      });
    } catch {
      handleMailtoFallback({
        payload,
        reason:
          "The support form is offline right now. Open your email app and send this message instead.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldLabelClass =
    "text-[11px] font-black uppercase tracking-[0.28em] text-white/60";
  const fieldClass =
    "mt-2 w-full rounded-[22px] border-2 border-white/15 bg-black px-4 py-3.5 text-sm font-semibold text-white outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 placeholder:text-white/35 focus:border-[#00E5FF]/60 focus:ring-4 focus:ring-[#00E5FF]/15";
  const primaryButtonClass = `${storefrontPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`;
  const supportHeroStats = [
    {
      label: "Replies",
      value: EXPECTED_REPLY_TIME,
    },
    {
      label: "Backup",
      value: "Email",
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            eyebrow="Support"
            title="Support"
            description="Send one message and we'll reply by email."
            stats={supportHeroStats}
            appearance="dark"
            accent="blue"
          />

          <SurfacePanel
            className="space-y-4 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="Help"
              title="Need another way?"
              description="If the form is down, email support."
            />

            <StorefrontInfoCard
              title={siteConfig.supportEmail}
              eyebrow="Support email"
              className="border-2 border-white/15 bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                Expected reply time: {EXPECTED_REPLY_TIME}.
              </p>
            </StorefrontInfoCard>

            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className={storefrontSecondaryButtonClass}
            >
              Email support
            </a>
          </SurfacePanel>
        </section>

        {commerceNotice ? (
          <CommerceSuccessBanner
            notice={commerceNotice}
            onDismiss={() => setCommerceNotice(null)}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfacePanel
            className="space-y-5 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            {successState ? (
              <div className="space-y-4">
                <StorefrontSectionHeading
                  eyebrow="Support"
                  title={
                    successState.mode === "mailto"
                      ? "Email backup ready"
                      : "Request received"
                  }
                  description={
                    successState.mode === "mailto"
                      ? successState.message
                      : `Expect a reply in ${EXPECTED_REPLY_TIME}.`
                  }
                />

                <div className="rounded-[24px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                    Reply email
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {successState.replyEmail}
                  </p>
                  {successState.topicLabel ? (
                    <p className="mt-3 text-sm font-medium text-white/70">
                      Issue type: {successState.topicLabel}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {successState.mode === "mailto" ? (
                    <a
                      href={successState.mailtoHref}
                      className={primaryButtonClass}
                    >
                      Open email app
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={resetForm}
                    className={
                      successState.mode === "mailto"
                        ? storefrontSecondaryButtonClass
                        : primaryButtonClass
                    }
                  >
                    Send another
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <StorefrontSectionHeading
                  eyebrow="Support form"
                  title="Send a request"
                  description={`We'll reply in ${EXPECTED_REPLY_TIME}.`}
                />

                {feedback.text ? (
                  <div className="rounded-[22px] border-2 border-[#FF007A] bg-black px-4 py-3 text-sm font-semibold text-[#FF007A] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {feedback.text}
                  </div>
                ) : null}

                <fieldset className="space-y-4">
                  <legend className={fieldLabelClass}>Issue details</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="support-topic" className={fieldLabelClass}>
                        Issue type
                      </label>
                      <select
                        id="support-topic"
                        value={activeTopic}
                        onChange={(event) => {
                          const nextPreset = getSupportTopicPreset(
                            event.target.value,
                          );
                          setActiveTopic(event.target.value);
                          setSuccessState(null);

                          if (nextPreset) {
                            setSubject((current) =>
                              current.trim() ? current : nextPreset.subject || "",
                            );
                            setMessage((current) => {
                              if (!isAutofilledSupportMessage(current)) {
                                return current;
                              }
                              return nextPreset.draft || "";
                            });
                          }
                        }}
                        className={fieldClass}
                      >
                        <option value="">Choose a topic</option>
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
                        required={!signedInReader}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className={fieldLabelClass}>Request details</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="support-order-id" className={fieldLabelClass}>
                        Order ID optional
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
                        placeholder="What do you need help with?"
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
                      rows={8}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Tell us what happened. Add the title, chapter, page, or order ID if it helps."
                      className={fieldClass}
                    />
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={primaryButtonClass}
                  >
                    {submitting ? "Sending..." : "Submit"}
                  </button>
                  <a
                    href={supportMailtoHref}
                    className={storefrontSecondaryButtonClass}
                  >
                    Email backup
                  </a>
                </div>
              </form>
            )}
          </SurfacePanel>

          <SurfacePanel
            className="space-y-4 border-2 border-white/15 bg-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            appearance="dark"
            accent="blue"
          >
            <StorefrontSectionHeading
              eyebrow="What to include"
              title="Make it easy to fix"
              description="Add the title, chapter, order ID, or screenshot details in your message."
            />

            <div className="rounded-[24px] border-2 border-white/15 bg-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <ul className="space-y-2 text-sm font-medium leading-6 text-white/70">
                <li>Use the issue type that fits best.</li>
                <li>Include your reply email if you're signed out.</li>
                <li>Add an order ID for billing problems when you have one.</li>
              </ul>
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}
