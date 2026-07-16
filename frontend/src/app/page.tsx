'use client';

import Link from 'next/link';
import {
  Dumbbell,
  Users,
  QrCode,
  Wallet,
  BarChart3,
  Bell,
  ShoppingBag,
  MessageCircle,
  ShieldCheck,
  Cloud,
  Smartphone,
  Link2,
  CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'إدارة الأعضاء', desc: 'تسجيل الأعضاء وبطاقات عضوية بباركود و QR' },
  { icon: QrCode, title: 'حضور بالـ QR', desc: 'تسجيل دخول فوري بمسح الكود — بدون ورق' },
  { icon: Wallet, title: 'الاشتراكات والمدفوعات', desc: 'خطط يومية وشهرية وجلسات مع سجل مالي كامل' },
  { icon: ShoppingBag, title: 'بيع المنتجات', desc: 'مياه ومكملات — بيع سريع من شاشة الاستقبال' },
  { icon: BarChart3, title: 'تقارير وتحليلات', desc: 'إيرادات، ساعات الذروة، ومعدل الاحتفاظ بالأعضاء' },
  { icon: Bell, title: 'تنبيهات واتساب', desc: 'تذكير تلقائي للأعضاء قبل انتهاء الاشتراك' },
];

const SAAS_POINTS = [
  { icon: Cloud, text: 'سحابي 100% — بدون تثبيت أي برنامج' },
  { icon: Smartphone, text: 'يشتغل من الموبايل والتابلت والكمبيوتر' },
  { icon: Link2, text: 'كل جيم بياخد رابط خاص بيه' },
  { icon: ShieldCheck, text: 'بياناتك محمية ومنفصلة تماماً عن باقي الجيمات' },
];

const STEPS = [
  { num: '01', title: 'تواصل معنا', desc: 'ابعتلنا رسالة على واتساب وهنجهز حسابك' },
  { num: '02', title: 'تجهيز نظامك', desc: 'بنعمل حسابك ورابطك الخاص خلال 24 ساعة' },
  { num: '03', title: 'ادخل وابدأ', desc: 'افتح الرابط من أي جهاز وابدأ على طول' },
];

export default function LandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">نظام إدارة الصالات الرياضية</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          دخول الإدارة
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-12 pt-14 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          <Cloud className="h-4 w-4" />
          نظام سحابي — SaaS
        </div>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          أدِر جيمك من أي مكان
          <br />
          <span className="text-primary">بدون تثبيت — بدون خوادم</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          نظام متكامل بالعربي لإدارة جيمك: الأعضاء، الاشتراكات، الحضور بالـ QR،
          المدفوعات، والتقارير — كل ده من رابط واحد على الإنترنت.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://wa.me/201017975972"
            className="inline-flex items-center gap-2 rounded-xl bg-success px-8 py-4 text-lg font-bold text-success-foreground shadow-lg transition-transform hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" />
            تواصل معنا واتساب
          </a>
        </div>
      </section>

      {/* SaaS Badges */}
      <section className="mx-auto max-w-4xl px-6 pb-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SAAS_POINTS.map((p) => (
            <div key={p.text} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 text-center shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium leading-snug">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">إزاي بيشتغل؟</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="relative rounded-2xl border bg-card p-6 shadow-sm">
              <span className="mb-3 block text-4xl font-extrabold text-primary/20">{s.num}</span>
              <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">كل اللي تحتاجه في مكان واحد</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-lg font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="mb-6 text-2xl font-bold">الأسعار</h2>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary/5 p-5">
              <p className="text-sm text-muted-foreground">رسوم التركيب والإعداد</p>
              <p className="mt-1 text-3xl font-extrabold text-primary">8,000 جنيه</p>
              <p className="mt-1 text-xs text-muted-foreground">مرة واحدة فقط</p>
            </div>
            <div className="rounded-2xl bg-primary/5 p-5">
              <p className="text-sm text-muted-foreground">اشتراك الاستضافة الشهري</p>
              <p className="mt-1 text-3xl font-extrabold text-primary">200 جنيه</p>
              <p className="mt-1 text-xs text-muted-foreground">شهرياً — يشمل التحديثات</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-2 text-sm text-muted-foreground">
            {['تدريب كامل على النظام', 'دعم فني بعد التسليم', 'تحديثات مجانية', 'بياناتك محفوظة على السحابة'].map((item) => (
              <div key={item} className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <a
            href="https://wa.me/201017975972"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            اطلب النظام الآن
          </a>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <span dir="ltr">© {new Date().getFullYear()}</span> — نظام إدارة الصالات الرياضية · 📞{' '}
        <span dir="ltr">01017975972</span>
      </footer>
    </div>
  );
}
