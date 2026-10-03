import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../assets/index.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Messages | React Messenger",
  description:
    "A Messenger-inspired React chat interface, modernized with Next.js.",
  icons: { icon: "/react-messenger.svg", apple: "/react-messenger.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
