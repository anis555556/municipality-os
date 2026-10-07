import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import SiteShell from "@/components/SiteShell";
export const metadata: Metadata = { title: { default: "Municipality OS — بلدية البريج", template: "%s · Municipality OS" }, description: "بوابة الخدمات والمشاريع والمشاركة المجتمعية لبلدية البريج. بيانات تجريبية — Demo Data.", applicationName: "Municipality OS", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07111F" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ar" dir="rtl"><body><SiteShell>{children}</SiteShell></body></html>; }
