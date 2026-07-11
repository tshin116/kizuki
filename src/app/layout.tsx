import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "kizuki",
  description: "毎日の気持ちを記録して、困ったときに相談できるアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-amber-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
