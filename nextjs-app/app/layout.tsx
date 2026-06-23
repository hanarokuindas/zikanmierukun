import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "時間見えるくん | IT講座 効果可視化ダッシュボード",
  description:
    "IT講座の事後アンケートを集計し、節約・効率化できた時間や満足度を可視化します。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
