'use client';

import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '@/lib/api';
import { FileItem } from '@/types';
import { formatBytes, formatDate, getFileIcon, getMimeLabel } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ImageIcon, Video, File, Download, Trash2, Clock,
  Search, Filter, RotateCcw, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const MIME_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
];

interface FileVersion {
  id: string;
  version_number: number;
  size: number;
  created_at: string;
}

function FileIcon({ mimeType, size = 18 }: { mimeType: string; size?: number }) {
  const type = getFileIcon(mimeType);
  if (type === 'image') return <ImageIcon size={size} />;
  if (type === 'video') return <Video size={size} />;
  return <File size={size} />;
}

function VersionDrawer({ fileId, onClose }: { fileId: string; onClose: () => void }) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    filesApi.getVersions(fileId)
      .then(res => setVersions(res.data.data || []))
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
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(26,25,21,0.4)' }} onClick={onClose}>
      <div
        className="w-80 h-full flex flex-col animate-slide-in"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Version history</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
              {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 transition-opacity">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>Loading…</div>
          ) : versions.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No versions found</div>
          ) : versions.map((v, i) => (
            <div key={v.id} className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent-dark)' }}>
                  v{v.version_number}
                </span>
                {i === 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-dark)' }}>
                    latest
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{formatBytes(v.size)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{formatDate(v.created_at)}</p>
              {i > 0 && (
                <button
                  onClick={() => restore(v.id)}
                  disabled={restoring === v.id}
                  className="mt-2.5 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-secondary)' }}>
                  <RotateCcw size={11} />
                  {restoring === v.id ? 'Restoring…' : 'Restore this version'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [versionsFileId, setVersionsFileId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; mime_type?: string } = { page, limit: LIMIT };
      if (mimeFilter) params.mime_type = mimeFilter;
      const res = await filesApi.list(params);
      const payload = res.data.data;
      setFiles(payload.data || payload || []);
      setTotal(payload.total || 0);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [page, mimeFilter]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const res = await filesApi.getDownloadUrl(fileId);
      const url = res.data.data?.url || res.data.data;
      window.open(url, '_blank');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await filesApi.delete(fileId);
      toast.success('File deleted');
      fetchFiles();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Files
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
          {total} file{total !== 1 ? 's' : ''} stored
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-8"
              style={{ height: '36px', padding: '0 0.75rem 0 2rem' }}
            />
          </div>

          <div className="flex items-center gap-1" style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: 'var(--surface)' }}>
            {MIME_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setMimeFilter(value); setPage(1); }}
                className="px-3 py-1.5 text-xs transition-all"
                style={{
                  background: mimeFilter === value ? 'var(--text-primary)' : 'transparent',
                  color: mimeFilter === value ? 'var(--bg)' : 'var(--text-secondary)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <File size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {search ? 'No files match your search' : 'No files yet'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
              {search ? 'Try a different search term' : 'Upload something to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-3 pb-2 mb-1">
              {['Name', 'Type', 'Size', 'Modified', ''].map((h, i) => (
                <div key={i}
                  className={`text-xs font-medium ${i === 0 ? 'col-span-5' : i === 4 ? 'col-span-2 text-right' : 'col-span-2'}`}
                  style={{ color: 'var(--text-muted)' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {filtered.map((file, idx) => (
                <div
                  key={file.id}
                  className="grid grid-cols-12 gap-4 items-center px-3 py-3 rounded-lg transition-colors group animate-fade-up"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    animationDelay: `${idx * 0.03}s`,
                    animationFillMode: 'both',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>

                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <FileIcon mimeType={file.mime_type} size={14} />
                    </div>
                    <span className="text-sm truncate" style={{ color: 'var(--text-primary)', fontWeight: 400 }}>
                      {file.name}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      {getMimeLabel(file.mime_type)}
                    </span>
                  </div>

                  <div className="col-span-2 text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
                    {formatBytes(file.size)}
                  </div>

                  <div className="col-span-1 text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
                    {formatDate(file.updated_at)}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      className="p-1.5 rounded-md transition-colors hover:opacity-70"
                      title="Download"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => setVersionsFileId(file.id)}
                      className="p-1.5 rounded-md transition-colors hover:opacity-70"
                      title="Version history"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Clock size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      className="p-1.5 rounded-md transition-colors hover:opacity-70"
                      title="Delete"
                      style={{ color: 'var(--destructive)', opacity: deletingId === file.id ? 0.5 : 1 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md transition-opacity disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md transition-opacity disabled:opacity-30"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Version drawer */}
      {versionsFileId && (
        <VersionDrawer fileId={versionsFileId} onClose={() => setVersionsFileId(null)} />
      )}
    </div>
  );
}
