import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Yinne", template: "%s · Yinne" },
  description: "Merchant commerce and financial-operations infrastructure.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The CSP in middleware.ts uses a per-request nonce, which Next.js can only attach to its
  // scripts when a page renders per request. Statically prerendered pages would ship scripts
  // without the nonce, and the browser would block them.
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
