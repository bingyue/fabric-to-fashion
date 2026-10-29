import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FABRIQ — 从面料，到成衣",
  description: "AI 面料成衣设计工作室。让一块面料，成为一个系列。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
