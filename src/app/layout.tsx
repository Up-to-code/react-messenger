import type * as React from "react";
import "../assets/index.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata = {
  title: "Messages | React Messenger",
  description:
    "A Messenger-inspired React chat interface, modernized with Next.js.",
  icons: { icon: "/react-messenger.svg", apple: "/react-messenger.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
