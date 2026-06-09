import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padawan — Insurance Broker Platform",
  description: "Secure risk-data collection and client management for brokers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
