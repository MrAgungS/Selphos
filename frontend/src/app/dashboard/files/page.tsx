'use client';

import { useState, useEffect, useCallback } from 'react';
import { filesApi } from '@/lib/api';
import { FileItem } from '@/types';
import { formatBytes, formatDate, getFileIcon, getMimeLabel } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ImageIcon, Video, File, Download, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader, EmptyState, SkeletonRows, FilterTabs, SearchInput, VersionDrawer } from '@/components/dashboard';

const MIME_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
];
const LIMIT = 20;

function FileTypeIcon({ mimeType, size = 14 }: { mimeType: string; size?: number }) {
  const type = getFileIcon(mimeType);
  if (type === 'image') return <ImageIcon size={size} />;
  if (type === 'video') return <Video size={size} />;
  return <File size={size} />;
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

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; mime_type?: string } = { page, limit: LIMIT };
      if (mimeFilter) params.mime_type = mimeFilter;
      const res = await filesApi.list(params);
      const payload = res.data.data;


      const fileList = Array.isArray(payload?.files) ? payload.files : [];
      const fileTotal = payload?.total ?? 0;
      
      setFiles(fileList);
      setTotal(fileTotal);
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [page, mimeFilter]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDownload = async (fileId: string) => {
    try {
      const res = await filesApi.getDownloadUrl(fileId);
      const url = res.data.data?.download_url;
  
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = res.data.data?.filename || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
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

  const filtered = files.filter(f => f.filename?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PageHeader title="Files" description={`${total} file${total !== 1 ? 's' : ''} stored`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search files…" />
          <FilterTabs
            tabs={MIME_FILTERS}
            active={mimeFilter}
            onChange={v => { setMimeFilter(v); setPage(1); }}
          />
        </div>
      </PageHeader>

      <div style={{ padding: '24px 32px' }}>
        {loading ? (
          <SkeletonRows count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={File}
            title={search ? 'No files match your search' : 'No files yet'}
            description={search ? 'Try a different search term' : 'Upload something to get started'}
          />
        ) : (
          <>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '5fr 1.5fr 1.5fr 1.5fr 1.5fr',
                padding: '0 12px 8px',
                gap: 12,
              }}
            >
              {['Name', 'Type', 'Size', 'Modified', ''].map((h, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                    textAlign: i === 4 ? 'right' : 'left',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {h}
                </p>
              ))}
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(file => (
                <div
                  key={file.file_id}
                  className="file-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '5fr 1.5fr 1.5fr 1.5fr 1.5fr',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 8,
                    gap: 12,
                    background: 'var(--surface)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                >
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <FileTypeIcon mimeType={file.mime_type} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.filename}
                    </span>
                  </div>

                  {/* Type */}
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      width: 'fit-content',
                    }}
                  >
                    {getMimeLabel(file.mime_type)}
                  </span>

                  {/* Size */}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>
                    {formatBytes(file.size)}
                  </span>

                  {/* Modified */}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>
                    {formatDate(file.updated_at)}
                  </span>

                  {/* Actions */}
                  <div
                    className="file-actions"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}
                  >
                    {[
                      { icon: Download, title: 'Download', onClick: () => handleDownload(file.file_id), color: 'var(--text-secondary)' },
                      { icon: Clock, title: 'Version history', onClick: () => setVersionsFileId(file.file_id), color: 'var(--text-secondary)' },
                      { icon: Trash2, title: 'Delete', onClick: () => handleDelete(file.file_id), color: 'var(--destructive)', disabled: deletingId === file.file_id },
                    ].map(({ icon: Icon, title, onClick, color, disabled }) => (
                      <button
                        key={title}
                        onClick={onClick}
                        disabled={disabled}
                        title={title}
                        style={{
                          padding: 6,
                          borderRadius: 5,
                          border: 'none',
                          background: 'none',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          color,
                          opacity: disabled ? 0.4 : 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>
                  Page {page} of {totalPages}
                </p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { icon: ChevronLeft, onClick: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                    { icon: ChevronRight, onClick: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
                  ].map(({ icon: Icon, onClick, disabled }) => (
                    <button
                      key={Icon.displayName}
                      onClick={onClick}
                      disabled={disabled}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        color: 'var(--text-secondary)',
                        opacity: disabled ? 0.3 : 1,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {versionsFileId && (
        <VersionDrawer fileId={versionsFileId} onClose={() => setVersionsFileId(null)} />
      )}

      <style>{`
        .file-row:hover .file-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
