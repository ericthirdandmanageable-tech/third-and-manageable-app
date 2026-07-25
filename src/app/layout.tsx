import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
});

export const metadata: Metadata = {
  title: "T&M Admin Dashboard",
  description: "Third & Manageable - Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${raleway.variable} bg-gray-950 text-white antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
