'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created — please sign in');
      router.push('/auth/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'var(--text-primary)' }}>
        <Link href="/" className="inline-flex items-center gap-2 text-sm transition-opacity opacity-60 hover:opacity-100"
          style={{ color: 'var(--bg)' }}>
          <ArrowLeft size={14} />
          Back
        </Link>
        <div>
          <p className="font-display text-4xl leading-tight" style={{ color: 'var(--bg)', letterSpacing: '-0.02em' }}>
            Join the<br />
            <em style={{ color: 'var(--accent)' }}>experiment.</em>
          </p>
          <p className="mt-4 text-sm leading-relaxed opacity-50" style={{ color: 'var(--bg)', fontWeight: 300 }}>
            Selphos is a personal cloud storage project. Create an account and start uploading your media.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-xs font-mono opacity-40" style={{ color: 'var(--bg)' }}>selphos.storage</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Link href="/" className="font-display text-xl mb-8 inline-block lg:hidden" style={{ color: 'var(--text-primary)' }}>
              Selphos
            </Link>
            <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Create account
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
              Join Selphos for free
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="input-base pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity opacity-40 hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-medium transition-opacity mt-2"
              style={{
                background: 'var(--text-primary)',
                color: 'var(--bg)',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
