import type { Metadata, Viewport } from "next";
import { Anuphan, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const anuphan = Anuphan({ variable: "--font-anuphan", subsets: ["thai"] });

export const metadata: Metadata = {
  title: { default: "ระบบแจ้งซ่อม", template: "%s | ระบบแจ้งซ่อม" },
  description: "ระบบแจ้งซ่อมและติดตามงานซ่อมบำรุง",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  // Lets the mobile tab bar sit above the iPhone home indicator (safe-area insets).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${inter.variable} ${anuphan.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
