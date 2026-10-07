import type { CityService, MapFeature } from "@/types";

export const demoServices: CityService[] = [
  { id: "service-building", slug: "building-permit", name: "رخصة بناء", category: "التنظيم والبناء", description: "تقديم ومتابعة طلب ترخيص بناء أو إضافة على عقار داخل حدود البلدية.", duration: "15 يوم عمل", fee: "تجريبية حسب نوع الطلب", status: "ACTIVE", requirements: ["إثبات الملكية أو عقد إيجار ساري", "مخططات هندسية معتمدة", "هوية مقدم الطلب"], steps: ["تعبئة بيانات العقار", "إرفاق الوثائق المطلوبة", "مراجعة فنية من البلدية", "استلام تحديث القرار"], icon: "⌂" },
  { id: "service-business", slug: "business-license", name: "رخصة مهنية", category: "التراخيص", description: "إصدار أو تجديد رخصة لمزاولة نشاط تجاري أو مهني.", duration: "7 أيام عمل", fee: "تجريبية حسب النشاط", status: "ACTIVE", requirements: ["عقد إيجار أو سند ملكية", "هوية صاحب المنشأة", "شهادة السلامة عند اللزوم"], steps: ["اختيار نوع النشاط", "إدخال بيانات الموقع", "إرفاق المستندات", "متابعة الطلب"], icon: "▧" },
  { id: "service-roads", slug: "road-maintenance", name: "صيانة طريق", category: "البنية التحتية", description: "الإبلاغ عن حفرة أو تلف في الرصيف وطلب المعالجة.", duration: "3 أيام عمل", fee: "دون رسوم تجريبية", status: "ACTIVE", requirements: ["تحديد الموقع على الخريطة", "وصف الحالة", "صورة توضيحية اختيارية"], steps: ["تحديد الموقع", "وصف المشكلة", "استلام رقم متابعة"], icon: "⌁" },
  { id: "service-lighting", slug: "street-lighting", name: "إنارة الشوارع", category: "البنية التحتية", description: "الإبلاغ عن عطل في عمود إنارة أو منطقة بحاجة إلى إنارة.", duration: "يومي عمل", fee: "دون رسوم تجريبية", status: "ACTIVE", requirements: ["وصف أقرب معلم", "تحديد الموقع"], steps: ["إرسال البلاغ", "توجيهه للفريق المختص", "متابعة المعالجة"], icon: "☼" },
  { id: "service-clean", slug: "waste-collection", name: "النظافة والنفايات", category: "الصحة والبيئة", description: "طلب رفع نفايات أو الإبلاغ عن تراكمها في موقع عام.", duration: "يوم عمل", fee: "دون رسوم تجريبية", status: "ACTIVE", requirements: ["تحديد الموقع", "وصف نوع النفايات"], steps: ["تحديد الموقع", "إرسال الطلب", "متابعة فريق النظافة"], icon: "♧" },
  { id: "service-occupancy", slug: "road-occupancy", name: "إشغال طريق", category: "التنظيم والبناء", description: "طلب إشغال مؤقت لمساحة من الطريق لأعمال أو نقل.", duration: "5 أيام عمل", fee: "رسوم تجريبية", status: "ACTIVE", requirements: ["مخطط موقع الإشغال", "مدة الإشغال", "تعهد بإعادة الموقع"], steps: ["تقديم التفاصيل", "المراجعة الميدانية", "إشعار بالقرار"], icon: "▤" },
  { id: "service-certificate", slug: "municipal-certificate", name: "شهادة بلدية", category: "الوثائق والشهادات", description: "طلب شهادة أو إفادة متاحة من خدمات البلدية.", duration: "3 أيام عمل", fee: "رسوم تجريبية", status: "ACTIVE", requirements: ["الهوية الشخصية", "تحديد نوع الشهادة"], steps: ["اختيار الشهادة", "إدخال البيانات", "استلام إشعار الجاهزية"], icon: "▱" },
  { id: "service-garden", slug: "tree-and-garden", name: "الحدائق والتشجير", category: "الصحة والبيئة", description: "طلب صيانة مساحة خضراء أو اقتراح موقع للتشجير.", duration: "5 أيام عمل", fee: "دون رسوم تجريبية", status: "ACTIVE", requirements: ["تحديد الموقع", "شرح الاحتياج"], steps: ["إرسال الاقتراح", "تقييم الموقع", "متابعة خطة العمل"], icon: "❋" }
];

export const demoProjects: MapFeature[] = [
  { id: "p1", name: "تأهيل شارع السوق المركزي", category: "مشروع بلدي", description: "تحسين طبقات الطريق والأرصفة في محيط السوق.", longitude: 34.4027, latitude: 31.4391, status: "قيد التنفيذ", progress: 64 },
  { id: "p2", name: "إنارة المدخل الشرقي", category: "مشروع بلدي", description: "تطوير منظومة الإنارة على الطريق الرئيسي.", longitude: 34.4081, latitude: 31.4418, status: "قيد التنفيذ", progress: 38 },
  { id: "p3", name: "تطوير الساحة العامة", category: "مشروع بلدي", description: "مساحة عامة تجريبية ضمن بيانات العرض.", longitude: 34.3974, latitude: 31.4362, status: "قيد التخطيط", progress: 12 }
];

export const demoFacilities: MapFeature[] = [
  { id: "f1", name: "مبنى البلدية", category: "مرفق عام", description: "مركز خدمات الجمهور — ساعات تجريبية: الأحد إلى الخميس، 08:00–15:00.", longitude: 34.4034, latitude: 31.4397 },
  { id: "f2", name: "مركز صحي البريج", category: "مركز صحي", description: "مرفق صحي — بيانات الموقع وساعات العمل تجريبية.", longitude: 34.3992, latitude: 31.4411 },
  { id: "f3", name: "حديقة الحي الشرقي", category: "حديقة", description: "مساحة خضراء عامة — بيانات تجريبية.", longitude: 34.4071, latitude: 31.4367 },
  { id: "f4", name: "مدرسة البريج الأساسية", category: "مدرسة", description: "مرفق تعليمي — بيانات تجريبية.", longitude: 34.3979, latitude: 31.4403 },
  { id: "f5", name: "مسجد الحي القديم", category: "مسجد", description: "مرفق ديني — بيانات تجريبية.", longitude: 34.4045, latitude: 31.4358 },
  { id: "f6", name: "سوق البريج", category: "سوق", description: "منطقة تجارية — بيانات تجريبية.", longitude: 34.4002, latitude: 31.4372 },
  { id: "f7", name: "ملعب الحي", category: "ملعب", description: "مساحة رياضية مجتمعية — بيانات تجريبية.", longitude: 34.4062, latitude: 31.4430 },
  { id: "f8", name: "مركز المجتمع", category: "مؤسسة", description: "مركز مجتمعي توضيحي ضمن بيانات العرض التجريبية.", longitude: 34.3958, latitude: 31.4381 }
];

export const demoNews = [
  { id: "n1", category: "إعلان خدمي", title: "بوابة متابعة الطلبات متاحة للمواطنين", date: "بيانات تجريبية", body: "يمكن للمواطنين متابعة حالة الطلبات والبلاغات من حساباتهم في المنصة." },
  { id: "n2", category: "مشاريع", title: "تحديث تجريبي لمشروع تأهيل شارع السوق", date: "بيانات تجريبية", body: "تتضمن لوحة المشاريع نسب إنجاز توضيحية لأغراض تجربة المنصة." },
  { id: "n3", category: "مشاركة مجتمعية", title: "شاركنا أولويات تحسين المرافق العامة", date: "بيانات تجريبية", body: "تتيح المنصة مساحة للمقترحات والاستطلاعات المجتمعية." }
];

export const mapCenter = { longitude: 34.4032, latitude: 31.4394 };
