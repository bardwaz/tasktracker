import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskTracker - Level Precedence Task Management",
  description: "Organizational task tracker with hierarchical level precedence and admin management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
