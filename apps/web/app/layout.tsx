import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "MMDC Sanity",
  description: "Internal sanity check dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}