import type { Metadata } from "next";
import Link from "next/link";
import ServicesIndex from "@/components/ServicesIndex";
export const metadata: Metadata = { title: "الخدمات البلدية" };
export default function ServicesPage() { return <><section className="page-hero"><div className="breadcrumbs"><Link href="/">الرئيسية</Link> / الخدمات</div><h1>خدمات أقرب وأسهل.</h1><p>ابدأ خدمة البلدية بخطوات واضحة، وأبقِ رقم المتابعة معك من لحظة التقديم حتى اكتمال الإجراء.</p></section><main className="page-content"><ServicesIndex /></main></>; }
