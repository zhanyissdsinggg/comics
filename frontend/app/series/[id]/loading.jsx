import Skeleton from "../../../components/common/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-2/3 rounded-full" />
      <Skeleton className="mt-4 h-5 w-1/2 rounded-full" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`skeleton-${index}`} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
