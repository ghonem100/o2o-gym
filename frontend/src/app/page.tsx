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
} from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'إدارة الأعضاء', desc: 'تسجيل الأعضاء وبطاقات عضوية بباركود و QR' },
  { icon: QrCode, title: 'حضور بالـ QR', desc: 'تسجيل دخول فوري بمسح الكود — بدون ورق' },
  { icon: Wallet, title: 'الاشتراكات والمدفوعات', desc: 'خطط يومية وشهرية وجلسات مع سجل مالي كامل' },
  { icon: ShoppingBag, title: 'بيع المنتجات', desc: 'مياه ومكملات — بيع سريع من شاشة الاستقبال' },
  { icon: BarChart3, title: 'تقارير وتحليلات', desc: 'إيرادات، ساعات الذروة، ومعدل الاحتفاظ بالأعضاء' },
  { icon: Bell, title: 'تنبيهات واتساب', desc: 'تذكير تلقائي للأعضاء قبل انتهاء الاشتراك' },
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
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-14 text-center">
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          نظام إدارة الصالة الرياضية
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          نظام متكامل بالعربي لإدارة جيمك: الأعضاء، الاشتراكات، الحضور بالـ QR،
          المدفوعات، والتقارير — كل ده من شاشة واحدة.
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
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
          <h2 className="mb-2 text-2xl font-bold">الأسعار</h2>
          <p className="text-4xl font-extrabold text-primary">
            8,000 جنيه <span className="text-lg font-semibold text-muted-foreground">تركيب</span>
          </p>
          <p className="mt-2 text-2xl font-bold">
            + 200 جنيه<span className="text-base font-medium text-muted-foreground"> / شهرياً</span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            يشمل التدريب والدعم الفني والتحديثات
          </p>
          <a
            href="https://wa.me/201017975972"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground transition-opacity hover:opacity-90"
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
