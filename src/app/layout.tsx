import type { Metadata, Viewport } from "next";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "TaskTracker - Level Precedence Task Management",
  description: "Organizational task tracker with hierarchical level precedence and real-time WhatsApp alerts.",
  applicationName: "TaskTracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TaskTracker",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <InstallPrompt />
      </body>
    </html>
  );
}
