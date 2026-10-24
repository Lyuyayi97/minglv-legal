import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "明律｜法律科普与求助",
  description: "用通俗的话解释法律问题，并为每个结论找到现行法条依据。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
