import Image from "next/image";

const toneMap = {
  warm: "linear-gradient(135deg, #ffb347 0%, #ff5f6d 100%)",
  cool: "linear-gradient(135deg, #6dd5ed 0%, #2193b0 100%)",
  dusk: "linear-gradient(135deg, #614385 0%, #516395 100%)",
  neon: "linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)",
  noir: "linear-gradient(135deg, #434343 0%, #000000 100%)",
  default: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
};

export default function Cover({ tone = "default", coverUrl, className = "" }) {
  const background = toneMap[tone] || toneMap.default;

  if (coverUrl) {
    return (
      <div className={`relative ${className}`.trim()} aria-hidden="true">
        <Image
          src={coverUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 160px, 240px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`cover ${className}`.trim()}
      style={{ background }}
      aria-hidden="true"
    />
  );
}
