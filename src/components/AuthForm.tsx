"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const fields = new FormData(event.currentTarget);
    const payload = Object.fromEntries(fields.entries());
    try { const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "تعذر إتمام تسجيل الدخول"); router.push(["ADMIN", "EDITOR", "STAFF", "SUPER_ADMIN"].includes(result.user.role) ? "/admin" : "/account"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر الاتصال بالخادم"); } finally { setBusy(false); }
  }
  const register = mode === "register";
  return <main className="auth-page"><section className="auth-intro"><span className="eyebrow">بوابة المواطن <span>Municipality OS</span></span><h1>{register ? <>مساحة رقمية<br />تبدأ بك.</> : <>مرحبًا بعودتك<br />إلى مدينتك.</>}</h1><p>{register ? "أنشئ حسابك لتقديم الطلبات ومتابعتها والمشاركة في شؤون المدينة." : "تابع خدماتك وطلباتك ومواعيدك من لوحة شخصية واحدة."}</p><div style={{ marginTop: 24 }}><span className="demo-label">بيانات هذه البيئة تجريبية</span></div></section><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><span className="section-kicker">{register ? "حساب جديد" : "دخول آمن"}</span><h2>{register ? "إنشاء حساب مواطن" : "تسجيل الدخول"}</h2><p>الوصول إلى الخدمات المدنية والمواعيد وسجل المتابعة.</p>{error && <div className="form-alert" role="alert">{error}</div>}<div className="form-stack">
      {register && <label className="form-field">الاسم الكامل<input name="name" autoComplete="name" required minLength={2} maxLength={120} placeholder="الاسم كما في الهوية" /></label>}
      <label className="form-field">البريد الإلكتروني<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="name@example.com" dir="ltr" /></label>
      {register && <label className="form-field">رقم الهاتف <small>(اختياري)</small><input name="phone" autoComplete="tel" maxLength={40} placeholder="059 xxx xxxx" dir="ltr" /></label>}
      <label className="form-field">كلمة المرور<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} placeholder={register ? "12 حرفًا على الأقل، مع رقم" : "••••••••••••"} /></label>
      {register && <small className="form-hint">12 حرفًا على الأقل، وحرف لاتيني واحد ورقم واحد.</small>}
      <button className="button button-primary" disabled={busy}>{busy ? <><span className="spinner" /> جارٍ التحقق...</> : <>{register ? "إنشاء الحساب" : "دخول إلى الحساب"} <span>←</span></>}</button>
    </div><div className="auth-bottom">{register ? <>لديك حساب بالفعل؟ <Link href="/login">سجّل الدخول</Link></> : <>مواطن جديد؟ <Link href="/register">أنشئ حسابًا</Link></>}</div></form></div></main>;
}
