import { NextRequest, NextResponse } from "next/server";
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.nextUrl.pathname.startsWith("/api/") && origin) {
    let configuredOrigin: string | null = null;
    try { if (process.env.NEXT_PUBLIC_APP_URL) configuredOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL).origin; } catch { configuredOrigin = null; }
    const allowed = new Set([request.nextUrl.origin, configuredOrigin].filter(Boolean));
    if (!allowed.has(origin)) return NextResponse.json({ error: "مصدر الطلب غير مسموح" }, { status: 403 });
  }
  const requestHeaders = new Headers(request.headers);
  const selectedTenant = request.cookies.get("municipality_tenant")?.value;
  if (selectedTenant && /^[a-z0-9][a-z0-9-]{1,60}$/.test(selectedTenant)) requestHeaders.set("x-municipality-slug", selectedTenant);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = { matcher: ["/api/:path*"] };
