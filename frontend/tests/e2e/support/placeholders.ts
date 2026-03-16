function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createInlinePlaceholder({
  label,
  width,
  height,
  background = "#1a1a2e",
  foreground = "#ffffff",
}: {
  label: string;
  width: number;
  height: number;
  background?: string;
  foreground?: string;
}): string {
  const safeLabel = escapeXml(label);
  const fontSize = Math.max(24, Math.round(Math.min(width, height) / 10));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${background}" />
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        fill="${foreground}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
      >
        ${safeLabel}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createPosterPlaceholder(label: string): string {
  return createInlinePlaceholder({ label, width: 600, height: 800 });
}

export function createBannerPlaceholder(label: string): string {
  return createInlinePlaceholder({ label, width: 1600, height: 900, background: "#101827" });
}

export function createReaderPagePlaceholder(label: string): string {
  return createInlinePlaceholder({ label, width: 800, height: 1200, background: "#111827" });
}
