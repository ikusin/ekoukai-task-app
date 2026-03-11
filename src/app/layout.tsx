import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "恵佼会タスク管理",
  description: "恵佼会タスク管理アプリ",
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
