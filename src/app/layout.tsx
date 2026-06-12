import type { Metadata } from "next";
import { Bodoni_Moda, Manrope, Space_Mono } from "next/font/google";
import "./globals.css";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { DuwellFooter } from "@/components/layout/DuwellFooter";

const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", weight: ["400", "700", "900"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const mono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Duwell — Rental Deposit Dispute Resolver",
  description: "Deposit disputes resolved through evidence and consensus.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodoni.variable} ${manrope.variable} ${mono.variable}`}>
      <body className="font-body min-h-screen flex flex-col">
        <TopNavigation />
        <main className="flex-1">{children}</main>
        <DuwellFooter />
      </body>
    </html>
  );
}
