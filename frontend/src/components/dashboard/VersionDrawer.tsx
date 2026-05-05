'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { filesApi } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FileVersion {
  id: string;
  version_number: number;
  size: number;
  created_at: string;
}

interface VersionDrawerProps {
  fileId: string;
  onClose: () => void;
}

export default function VersionDrawer({ fileId, onClose }: VersionDrawerProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    filesApi
      .getVersions(fileId)
      .then(res => {
        const data = res.data.data;
        const list = Array.isArray(data) ? data : Array.isArray(data?.versions) ? data.versions : [];
        setVersions(list);
      })
      .catch(() => toast.error('Failed to load versions'))
      .finally(() => setLoading(false));
  }, [fileId]);

  const restore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      await filesApi.restoreVersion(fileId, versionId);
      toast.success('Version restored');
      onClose();
    } catch {
      toast.error('Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(26,25,21,0.4)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          animation: 'slideIn 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              Version history
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)', fontWeight: 300 }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ fontSize: 12, textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Loading…</p>
          ) : versions.length === 0 ? (
            <p style={{ fontSize: 12, textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>No versions found</p>
          ) : versions.map((v, i) => (
            <div
              key={v.id}
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--accent-dark)' }}>
                  v{v.version_number}
                </span>
                {i === 0 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent-dark)',
                    }}
                  >
                    latest
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>{formatBytes(v.size)}</p>
              <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)', fontWeight: 300 }}>{formatDate(v.created_at)}</p>
              {i > 0 && (
                <button
                  onClick={() => restore(v.id)}
                  disabled={restoring === v.id}
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    background: 'none',
                    border: 'none',
                    cursor: restoring === v.id ? 'not-allowed' : 'pointer',
                    color: 'var(--text-secondary)',
                    opacity: restoring === v.id ? 0.5 : 1,
                    padding: 0,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  <RotateCcw size={10} />
                  {restoring === v.id ? 'Restoring…' : 'Restore this version'}
                </button>
              )}
            </div>
          ))}
        </div>

        <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      </div>
    </div>
  );
}
