export const metadata = {
  title: "MangaNovel (Tappytoon-style UI)",
  description: "Demo UI scaffold",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
