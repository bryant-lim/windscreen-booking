import type { Metadata } from "next";
import { Inter } from "next/font/google";
import WhatsAppButton from "../components/WhatsAppButton";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "WS2U Analytics Hub | High-End Glass Booking",
  description: "Enterprise-grade vehicle glass registry and appointment scheduler.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-inter`}>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
