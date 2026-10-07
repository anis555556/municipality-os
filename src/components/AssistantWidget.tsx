"use client";
import { FormEvent, useState } from "react";
type Message = { from: "user" | "assistant"; text: string };
const answers: [RegExp, string][] = [
  [/رخص|بناء|ترخيص/, "يمكنك بدء طلب رخصة البناء من دليل الخدمات. ستحتاج إلى إثبات الملكية ومخططات هندسية وهوية مقدم الطلب. المدة والرسوم المعروضة تقديرية ضمن بيانات المنصة التجريبية."],
  [/شكوى|بلاغ|حفرة|إنارة|نفايات/, "من صفحة حساب المواطن اختر «شكوى جديدة»، ثم حدّد الموقع على الخريطة وأرفق صورة اختيارية. ستحصل على رقم متابعة وتظهر تحديثاته في سجل الشكوى."],
  [/موعد|حجز/, "يمكنك إرسال طلب موعد من صفحة المواعيد بعد تسجيل الدخول. الموعد يصبح مطلوبًا للمراجعة ويظهر لك إشعار برقم المتابعة."],
  [/مشروع|إنجاز|شفافية/, "تعرض صفحة الشفافية المشاريع ونسب إنجاز توضيحية. كل الأرقام والمعلومات الظاهرة الآن بيانات تجريبية وليست بيانات بلدية رسمية."],
  [/موقع|خريطة|مرفق|مدرسة|صحي/, "افتح دليل المدينة لاستعراض المدارس والمراكز الصحية والحدائق والمرافق على خريطة تفاعلية. مواقع وأوصاف هذا الإصدار بيانات تجريبية."],
  [/حساب|تسجيل|كلمة مرور/, "أنشئ حساب مواطن من صفحة التسجيل. كلمة المرور لا تقل عن 12 حرفًا وتتطلب حرفًا لاتينيًا ورقمًا."],
];
export default function AssistantWidget() {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState<Message[]>([{ from: "assistant", text: "أهلًا بك. أساعدك في معرفة الخدمات والخطوات ومواقع المرافق. إجاباتي تعتمد على قاعدة معرفة تجريبية." }]); const [value, setValue] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const question = value.trim(); if (!question) return; const answer = answers.find(([pattern]) => pattern.test(question))?.[1] ?? "يمكنني المساعدة في الخدمات البلدية، الطلبات، الشكاوى، المواعيد ومرافق المدينة. جرّب سؤالًا أكثر تحديدًا. هذه إجابة تجريبية، ويمكن ربط المساعد لاحقًا بخدمة ذكاء اصطناعي معتمدة."; setMessages((list) => [...list, { from: "user", text: question }, { from: "assistant", text: answer }]); setValue(""); }
  return <div className="assistant-root"><button className="assistant-launch" aria-label={open ? "إغلاق المساعد الذكي" : "فتح المساعد الذكي"} onClick={() => setOpen(!open)}><span className="holo-orb">✦</span><span>مساعد البريج</span><i /></button>
    {open && <section className="assistant-panel" aria-label="المساعد البلدي التجريبي"><div className="assistant-head"><span className="holo-orb">✦</span><div><strong>مساعد المدينة</strong><small>قاعدة معرفة تجريبية</small></div><button onClick={() => setOpen(false)} aria-label="إغلاق">×</button></div><div className="assistant-messages" aria-live="polite">{messages.map((message, index) => <p key={index} className={`assistant-message ${message.from}`}>{message.text}</p>)}</div><form onSubmit={submit} className="assistant-form"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="اسأل عن خدمة أو إجراء..." aria-label="اكتب سؤالك" maxLength={500} /><button type="submit" aria-label="إرسال السؤال">←</button></form><small className="assistant-disclaimer">الإجابات توضيحية ولا تمثل قرارًا بلديًا رسميًا.</small></section>}
  </div>;
}
