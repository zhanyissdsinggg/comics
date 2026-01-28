"use client";

export default function AdultGateBlockingPanel({ status, onOpenModal }) {
  const title =
    status === "NEED_LOGIN" ? "Login required" : "Age confirmation required";
  const description =
    status === "NEED_LOGIN"
      ? "Please sign in to view adult content."
      : "Confirm your age and enable adult mode to continue.";

  return (
    <section className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-900 bg-neutral-900/60 p-6 text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-neutral-400">{description}</p>
        <button
          type="button"
          onClick={onOpenModal}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
