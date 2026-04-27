'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadsApi } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Upload, X, CheckCircle, AlertCircle, ImageIcon, Video, File, CloudUpload } from 'lucide-react';
import axios from 'axios';

type UploadState = 'idle' | 'initiating' | 'uploading' | 'confirming' | 'done' | 'error';

interface UploadItem {
  id: string;
  file: File;
  state: UploadState;
  progress: number;
  error?: string;
  uploadId?: string;
}

function getIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon size={14} />;
  if (mimeType.startsWith('video/')) return <Video size={14} />;
  return <File size={14} />;
}

const stateLabel: Record<UploadState, string> = {
  idle: 'Queued',
  initiating: 'Preparing…',
  uploading: 'Uploading…',
  confirming: 'Finalizing…',
  done: 'Complete',
  error: 'Failed',
};

export default function UploadsPage() {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const uploadFile = async (item: UploadItem) => {
    updateItem(item.id, { state: 'initiating' });
    try {
      // 1. Initiate
      const initiateRes = await uploadsApi.initiate({
        file_name: item.file.name,
        mime_type: item.file.type,
        size: item.file.size,
      });
      const { upload_id, presigned_url } = initiateRes.data.data;
      updateItem(item.id, { uploadId: upload_id, state: 'uploading' });

      // 2. Upload to S3
      let etag = '';
      await axios.put(presigned_url, item.file, {
        headers: { 'Content-Type': item.file.type },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / (e.total || item.file.size)) * 100);
          updateItem(item.id, { progress: pct });
        },
      }).then(res => {
        etag = res.headers.etag || '';
      });

      // 3. Confirm
      updateItem(item.id, { state: 'confirming' });
      await uploadsApi.confirm(upload_id, { etag });
      updateItem(item.id, { state: 'done', progress: 100 });
      toast.success(`${item.file.name} uploaded`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Upload failed';
      updateItem(item.id, { state: 'error', error: msg });
      toast.error(msg);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: UploadItem[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      state: 'idle',
      progress: 0,
    }));
    setItems(prev => [...prev, ...newItems]);
    newItems.forEach(item => uploadFile(item));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
    },
  });

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearDone = () => {
    setItems(prev => prev.filter(i => i.state !== 'done'));
  };

  const doneCount = items.filter(i => i.state === 'done').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 className="font-display text-2xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Upload
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
          Drop your photos and videos here
        </p>
      </div>

      <div className="px-8 py-6 max-w-2xl">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="relative flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
            background: isDragActive ? 'var(--accent-subtle)' : 'var(--surface)',
            padding: '3rem 2rem',
            minHeight: '200px',
          }}>
          <input {...getInputProps()} />

          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors"
            style={{ background: isDragActive ? 'rgba(200,169,110,0.2)' : 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <CloudUpload size={20} style={{ color: isDragActive ? 'var(--accent-dark)' : 'var(--text-muted)' }} />
          </div>

          <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {isDragActive ? 'Drop to upload' : 'Drop files here'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
            or <span className="underline underline-offset-2" style={{ color: 'var(--text-secondary)' }}>browse your files</span>
          </p>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>
            Images & videos — JPEG, PNG, GIF, WebP, MP4, WebM, MOV
          </p>
        </div>

        {/* Upload queue */}
        {items.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {items.length} file{items.length !== 1 ? 's' : ''}
              </p>
              {doneCount > 0 && (
                <button
                  onClick={clearDone}
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}>
                  Clear completed
                </button>
              )}
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id}
                  className="p-3 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {getIcon(item.file.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {item.file.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.state === 'done' && <CheckCircle size={13} style={{ color: 'var(--success)' }} />}
                          {item.state === 'error' && <AlertCircle size={13} style={{ color: 'var(--destructive)' }} />}
                          <span className="text-xs font-mono" style={{
                            color: item.state === 'done' ? 'var(--success)'
                              : item.state === 'error' ? 'var(--destructive)'
                              : 'var(--text-muted)',
                          }}>
                            {stateLabel[item.state]}
                          </span>
                          {(item.state === 'done' || item.state === 'error') && (
                            <button onClick={() => removeItem(item.id)}
                              className="transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${item.progress}%`,
                              background: item.state === 'done' ? 'var(--success)'
                                : item.state === 'error' ? 'var(--destructive)'
                                : 'var(--accent)',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                          {formatBytes(item.file.size)}
                        </span>
                      </div>

                      {item.error && (
                        <p className="text-xs mt-1" style={{ color: 'var(--destructive)', fontWeight: 300 }}>
                          {item.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>How uploads work</p>
          <div className="space-y-1.5">
            {[
              'Files are uploaded directly to secure cloud storage',
              'Each file is versioned automatically on upload',
              'You can restore any previous version from the Files page',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>0{i + 1}</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
