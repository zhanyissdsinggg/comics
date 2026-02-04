import SiteHeader from "../../components/layout/SiteHeader";

export const metadata = {
  title: "FAQ",
  description: "Frequently asked questions and support info.",
};

const FAQ = [
  {
    q: "How do I unlock episodes?",
    a: "Use POINTS to unlock or wait for TTF if eligible. Subscription perks may reduce cost.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Go to Account > Subscription and tap Cancel. You can re-subscribe anytime.",
  },
  {
    q: "Where can I see my orders?",
    a: "Open Account > View Orders to see your recent purchases.",
  },
  {
    q: "Why can’t I see adult series?",
    a: "Enable 18+ mode and confirm age in the gate flow.",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Help & FAQ</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Common questions and quick fixes.
          </p>
        </div>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4"
            >
              <h2 className="text-sm font-semibold">{item.q}</h2>
              <p className="mt-2 text-sm text-neutral-400">{item.a}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-400">
          Need more help? Email support@tappytoon.local (mock).
        </div>
      </main>
    </div>
  );
}
