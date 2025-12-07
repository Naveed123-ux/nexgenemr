import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/components/Storeprovider";

// ✅ initialize the font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // pick the weights you need
});

export const metadata: Metadata = {
  title: "NexgenEmr - Hospital Management",
  description: "Hospital Management Dashboard",
  icons: {
    icon: "/favicon2bg.png", // or "/favicon.png"
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <Toaster position="top-right" reverseOrder={false} />
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
