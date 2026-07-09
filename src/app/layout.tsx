import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom UNO",
  description: "Multiplayer UNO with configurable house rules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
