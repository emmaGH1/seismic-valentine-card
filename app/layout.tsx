import type { Metadata } from "next";
import { Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Seismic Valentine's Card",
  description: "Send a Valentine's card to your favorite Seismic community member",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${caveat.variable}`}>
      <body>{children}</body>
    </html>
  );
}