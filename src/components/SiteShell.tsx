"use client";
/* eslint-disable @next/next/no-img-element -- municipality logos are user-configurable external URLs. */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import AssistantWidget from "@/components/AssistantWidget";
import type { MunicipalityProfile } from "@/types";

const navItems = [["الرئيسية", "/"], ["الخدمات", "/services"], ["دليل المدينة", "/city-guide"], ["المشاريع", "/transparency"], ["الأخبار", "/news"], ["الفعاليات", "/events"], ["المشاركة", "/participation"]];
type SearchResult = { name?: string; title?: string; kind: string; href: string; description?: string; excerpt?: string };
export default function SiteShell({ children }: { children: ReactNode }) {
  const path = usePathname(); const router = useRouter(); const searchRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<MunicipalityProfile | null>(null); const [user, setUser] = useState<{ name: string; role: string } | null>(null); const [tenants, setTenants] = useState<{ id: string; name: string; slug: string }[]>([]); const [selectedTenant, setSelectedTenant] = useState("");
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [searchOpen, setSearchOpen] = useState(false); const [accessOpen, setAccessOpen] = useState(false);
  const [largeText, setLargeText] = useState(false); const [highContrast, setHighContrast] = useState(false); const [simplified, setSimplified] = useState(false); const [clock, setClock] = useState(""); const [developerOpen, setDeveloperOpen] = useState(false);
  useEffect(() => {
    fetch("/api/municipality").then((response) => response.ok ? response.json() : null).then((result) => { if (result?.municipality) { setProfile(result.municipality); setSelectedTenant(result.municipality.slug); } }).catch(() => undefined);
    fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((result) => { if (result?.user) { setUser(result.user); if (result.user.role === "SUPER_ADMIN") fetch("/api/municipalities").then((r) => r.ok ? r.json() : null).then((data) => setTenants(data?.data || [])).catch(() => undefined); } }).catch(() => undefined);
    const preference = localStorage.getItem("municipality-os-accessibility"); if (preference) { const saved = JSON.parse(preference) as { largeText?: boolean; highContrast?: boolean; simplified?: boolean }; setLargeText(Boolean(saved.largeText)); setHighContrast(Boolean(saved.highContrast)); setSimplified(Boolean(saved.simplified)); }
    const updateClock = () => setClock(new Intl.DateTimeFormat("ar-PS", { timeZone: "Asia/Gaza", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date()));
    updateClock(); const timer = window.setInterval(updateClock, 60_000); return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const root = document.documentElement; root.classList.toggle("access-large-text", largeText); root.classList.toggle("access-high-contrast", highContrast); root.classList.toggle("access-simplified", simplified);
    localStorage.setItem("municipality-os-accessibility", JSON.stringify({ largeText, highContrast, simplified }));
  }, [largeText, highContrast, simplified]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => fetch(`/api/search?q=${encodeURIComponent(query.trim())}`).then((response) => response.json()).then((result) => setResults(result.data || [])).catch(() => setResults([])), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => { const handleShortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.querySelector("input")?.focus(); } }; window.addEventListener("keydown", handleShortcut); return () => window.removeEventListener("keydown", handleShortcut); }, []);
  useEffect(() => { function outside(event: MouseEvent) { if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false); } document.addEventListener("mousedown", outside); return () => document.removeEventListener("mousedown", outside); }, []);
  function searchSubmit(event: FormEvent) { event.preventDefault(); if (query.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(query.trim())}`); }
  const theme = { "--municipal-red": profile?.brandPrimary || "#D71920", "--municipal-green": profile?.brandSecondary || "#009B4D" } as React.CSSProperties;
  function changeTenant(slug: string) { setSelectedTenant(slug); document.cookie = `municipality_tenant=${encodeURIComponent(slug)}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; window.location.reload(); }
  return <div className="site-root" style={theme}>
    <div style={{ position: "relative", zIndex: 30, display: "flex", justifyContent: "center", padding: "8px 16px", background: "#07111F", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
      <button
        type="button"
        onClick={() => setDeveloperOpen((open) => !open)}
        aria-expanded={developerOpen}
        aria-controls="developer-info"
        style={{ border: 0, background: "transparent", color: "#F2C300", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: ".02em" }}
      >
        من هو المطور؟
      </button>
      {developerOpen && (
        <div id="developer-info" role="dialog" aria-label="Developer information" style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", minWidth: 300, padding: "14px 18px", borderRadius: 14, background: "rgba(7,17,31,.96)", border: "1px solid rgba(242,195,0,.35)", boxShadow: "0 18px 50px rgba(0,0,0,.3)", textAlign: "center", direction: "ltr" }}>
          <strong style={{ display: "block", color: "#FFFFFF", fontSize: 14 }}>Developer of this program</strong>
          <span style={{ display: "block", marginTop: 5, color: "#F2C300", fontSize: 15, fontWeight: 700 }}>Anis Ali Al-Shashniya</span>
        </div>
      )}
    </div>
    <div className="demo-ribbon"><span>●</span> بيئة تشغيل تجريبية — بيانات وخدمات توضيحية <b>DEMO</b></div>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="العودة إلى الرئيسية"><span className="brand-mark">{profile?.logoUrl ? <img src={profile.logoUrl} alt="" /> : <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M5 34 24 7l19 27v8H5z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 33h24M17 26h14M21 19h6M22 42V31h5v11" fill="none" stroke="currentColor" strokeWidth="2"/></svg>}</span><span className="brand-copy"><strong>{profile?.name || "بلدية البريج"}</strong><small>MUNICIPALITY OS <i>●</i> SMART CITY</small></span></Link>
      <nav className="primary-nav" aria-label="التنقل الرئيسي">{navItems.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={path === href ? "active" : ""}>{label}</Link>)}</nav>
      <div className="header-actions"><div className="global-search" ref={searchRef}><form onSubmit={searchSubmit} role="search"><span>⌕</span><input value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المدينة..." aria-label="البحث في الخدمات والمرافق" /><kbd>⌘ K</kbd></form>{searchOpen && query.length >= 2 && <div className="search-popover" role="listbox">{results.length ? results.slice(0, 6).map((item, index) => <Link href={item.href} key={`${item.kind}-${index}`} onClick={() => setSearchOpen(false)}><small>{item.kind}</small><strong>{item.name || item.title}</strong><span>{item.description || item.excerpt}</span></Link>) : <p>جارٍ البحث أو لا توجد نتائج...</p>}<Link className="search-all" href={`/search?q=${encodeURIComponent(query)}`}>عرض جميع النتائج ←</Link></div>}</div>
        <button className="icon-action accessibility-trigger" onClick={() => setAccessOpen(!accessOpen)} aria-expanded={accessOpen} aria-label="إعدادات إمكانية الوصول">◉</button>
        {user?.role === "SUPER_ADMIN" && tenants.length > 0 && <select className="tenant-switcher" aria-label="اختيار البلدية" value={selectedTenant} onChange={(event) => changeTenant(event.target.value)}>{tenants.map((tenant) => <option key={tenant.id} value={tenant.slug}>{tenant.name}</option>)}</select>}
        {user ? <Link className="user-chip" href={user.role === "CITIZEN" ? "/account" : "/admin"}><span className="user-avatar">{user.name.slice(0, 1)}</span><span>{user.name.split(" ")[0]}<small>{user.role === "CITIZEN" ? "حسابي" : "الإدارة"}</small></span></Link> : <Link className="login-link" href="/login">دخول <span>↗</span></Link>}
      </div>
      {accessOpen && <div className="access-popover" role="dialog" aria-label="إعدادات إمكانية الوصول"><strong>إمكانية الوصول</strong><label><input type="checkbox" checked={largeText} onChange={(e) => setLargeText(e.target.checked)} /> خط أكبر</label><label><input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} /> تباين عالٍ</label><label><input type="checkbox" checked={simplified} onChange={(e) => setSimplified(e.target.checked)} /> وضع مبسط</label><button onClick={() => { setLargeText(false); setHighContrast(false); setSimplified(false); }}>إعادة الضبط</button></div>}
    </header>
    {children}
    <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link href="/" className="brand"><span className="brand-mark">{profile?.logoUrl ? <img src={profile.logoUrl} alt="" /> : <svg viewBox="0 0 48 48"><path d="M5 34 24 7l19 27v8H5z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 33h24M17 26h14M21 19h6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>}</span><span className="brand-copy"><strong>{profile?.name || "بلدية البريج"}</strong><small>MUNICIPALITY OS</small></span></Link><p>مساحة رقمية تجمع الخدمات والمعلومات والمشاركة المجتمعية في مكان واحد.</p></div><div><strong>خدمات المدينة</strong><Link href="/services">دليل الخدمات</Link><Link href="/account/complaints">تقديم شكوى</Link><Link href="/account/appointments">حجز موعد</Link></div><div><strong>اكتشف المدينة</strong><Link href="/city-guide">دليل المدينة</Link><Link href="/transparency">الشفافية</Link><Link href="/news">الأخبار والإعلانات</Link><Link href="/events">الفعاليات</Link><Link href="/participation">المشاركة المجتمعية</Link></div><div><strong>مركز التواصل</strong><p>{profile?.phone || "هاتف البلدية تجريبي"}</p><p>{profile?.email || "بريد البلدية تجريبي"}</p><small>{String(profile?.settings?.businessHours || "الأحد – الخميس · 08:00 – 15:00")}</small></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Municipality OS · منصة تجريبية</span><span>{clock || ""}</span><span>الخريطة: OpenStreetMap · OpenFreeMap</span></div></footer>
    <AssistantWidget />
  </div>;
}
