'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Files, Upload, LogOut, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard/files', label: 'Files', icon: Files },
  { href: '/dashboard/uploads', label: 'Upload', icon: Upload },
];

const SIDEBAR_W = 220;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out');
      router.push('/');
    } catch {
      toast.error('Error signing out');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Link href="/dashboard/files" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--text-primary)',
              flexShrink: 0,
            }}>
              <Cloud size={13} style={{ color: 'var(--bg)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Selphos
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  textDecoration: 'none',
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ padding: '6px 12px', marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)', fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 7,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: SIDEBAR_W, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}