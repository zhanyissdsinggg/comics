"use client";

export default function LibraryError({ error, reset }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
      <div className="w-full rounded-3xl border border-neutral-900 bg-neutral-900/60 p-6 text-center">
        <h1 className="text-2xl font-semibold">Library error</h1>
        <p className="mt-2 text-sm text-neutral-400">
          {error?.message || "Please try again."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-900"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
