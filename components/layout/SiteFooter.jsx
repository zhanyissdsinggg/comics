export default function SiteFooter() {
  return (
    <footer className="mt-12 hidden border-t border-neutral-900 bg-neutral-950/90 text-neutral-400 md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <a href="/diagnostics" className="hover:text-white">
            Diagnostics
          </a>
          <a href="/events" className="hover:text-white">
            Events
          </a>
          <a href="/faq" className="hover:text-white">
            Help
          </a>
          <a href="/support" className="hover:text-white">
            Support
          </a>
        </div>
        <div className="text-[11px] text-neutral-500">MN</div>
      </div>
    </footer>
  );
}
