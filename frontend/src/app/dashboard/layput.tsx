'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Files, Upload, LogOut, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard/files', label: 'Files', icon: Files },
  { href: '/dashboard/uploads', label: 'Upload', icon: Upload },
];

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>Loading…</div>
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
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Link href="/dashboard/files" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--text-primary)' }}>
              <Cloud size={13} style={{ color: 'var(--bg)' }} />
            </div>
            <span className="font-display text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Selphos
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all',
                  active ? 'font-medium' : 'font-normal'
                )}
                style={{
                  background: active ? 'var(--accent-subtle)' : 'transparent',
                  color: active ? 'var(--accent-dark)' : 'var(--text-secondary)',
                }}>
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name || 'User'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-secondary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
