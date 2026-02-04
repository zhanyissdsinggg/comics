import { useBackendMeta } from "../../hooks/useBackendMeta";

export default function BackendMetaBadge() {
  const meta = useBackendMeta();

  if (!meta) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 z-40 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[10px] text-neutral-400">
      {meta.name} v{meta.version}
    </div>
  );
}
