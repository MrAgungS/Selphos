'use client';

import Link from 'next/link';
import { ArrowRight, Cloud, ImageIcon, Video, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(250,250,247,0.85)', backdropFilter: 'blur(12px)' }}>
        <span className="font-display text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Selphos
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login"
            className="text-sm px-4 py-2 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)', fontWeight: 400 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
            Sign in
          </Link>
          <Link href="/auth/register"
            className="text-sm px-4 py-2 rounded-md transition-all"
            style={{ background: 'var(--text-primary)', color: 'var(--bg)', fontWeight: 400 }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center pt-16">
        {/* Decorative ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
          style={{ border: '1px solid var(--accent)', animation: 'fadeIn 1s ease forwards' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none opacity-10"
          style={{ border: '1px solid var(--accent)' }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-xs font-mono animate-fade-up"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
            Now in early access
          </div>

          <h1 className="font-display animate-fade-up stagger-1"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Your memories,<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>simply stored.</em>
          </h1>

          <p className="mt-6 text-base leading-relaxed animate-fade-up stagger-2 max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>
            Selphos is an experiment in cloud storage — a clean, personal space to keep your photos and videos. Nothing more, nothing less.
          </p>

          <div className="flex items-center justify-center gap-3 mt-10 animate-fade-up stagger-3">
            <Link href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm transition-all group"
              style={{ background: 'var(--text-primary)', color: 'var(--bg)' }}>
              Start storing
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm transition-all"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {[
            { icon: ImageIcon, label: 'Photos', desc: 'Store all your image formats — JPEG, PNG, WebP, and more.' },
            { icon: Video, label: 'Videos', desc: 'MP4, WebM, MOV. Your footage, backed up securely.' },
            { icon: Shield, label: 'Versioning', desc: 'Every upload is versioned. Restore anything, anytime.' },
          ].map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="p-8 transition-colors" style={{ background: 'var(--surface)', borderRight: i < 2 ? '1px solid var(--border)' : undefined }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-5"
                style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(200,169,110,0.2)' }}>
                <Icon size={16} style={{ color: 'var(--accent-dark)' }} />
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="mt-16 text-center">
          <p className="font-display text-lg italic" style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>
            Im just experimenting with how cloud-based storage works.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px w-12" style={{ background: 'var(--border)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Selphos, 2024</span>
            <div className="h-px w-12" style={{ background: 'var(--border)' }} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-6 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <span className="font-display text-sm" style={{ color: 'var(--text-muted)' }}>Selphos</span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>an experiment</span>
      </footer>
    </main>
  );
}
