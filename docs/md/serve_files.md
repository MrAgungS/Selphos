# Serve File API Spec

New features will be added once the files, uploads, user interface, and frontend of Selphos are complete

---

## Overview

The Serve File API provides time-limited public access to uploaded files via
presigned URLs generated from RustFS. The API is **not** in the data path, 
clients download directly from RustFS using the signed URL.

> All endpoints require a valid `access_token`.

---

## Get Public Share Link

Generate a **time-limited public URL** for sharing a file without requiring authentication.
Anyone with the URL can access the file until it expires.

**Endpoint:** `POST /api/s3/files/:file_id/share`

**Headers:**
```
- authorization: access_token
```

**Request Body:**
```json
{
  "expires_in": 3600
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expires_in` | number | No | Expiry in seconds. Default: `3600` (1 hour). Max: `604800` (7 days) |

**Response Success `200`:**
```json
{
  "data": {
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "filename": "photo.jpg",
    "share_url": "http://localhost:9000/my-bucket-compressed/uploads/compressed/.../photo.webp?X-Amz-Signature=...",
    "expires_at": "2025-01-01T14:00:00.000Z"
  }
}
```

> If `compression_status` is `done`, the URL points to the compressed file.
> Otherwise, it falls back to the raw file.

**Failed — validation error `400`:**
```json
{
  "statusCode": 400,
  "errors": "expires_in must not exceed 604800 seconds (7 days)"
}
```

**Failed — file not found `404`:**
```json
{
  "statusCode": 404,
  "errors": "File not found"
}
```

**Failed — file has been deleted `410`:**
```json
{
  "statusCode": 410,
  "errors": "File has been deleted"
}
```

---

## Get Share Link for Specific Version

Generate a public URL for a **specific file version** instead of the current active version.

**Endpoint:** `POST /api/s3/files/:file_id/versions/:version_id/share`

**Headers:**
```
- authorization: access_token
```

**Request Body:**
```json
{
  "expires_in": 3600
}
```

**Response Success `200`:**
```json
{
  "data": {
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "version_id": "1a2b3c4d-5e6f-7890-ab12-cd34ef567890",
    "filename": "photo.jpg",
    "share_url": "http://localhost:9000/my-bucket/uploads/raw/.../photo.jpg?X-Amz-Signature=...",
    "expires_at": "2025-01-01T14:00:00.000Z"
  }
}
```

**Failed — validation error `400`:**
```json
{
  "statusCode": 400,
  "errors": "expires_in must not exceed 604800 seconds (7 days)"
}
```

**Failed — file not found `404`:**
```json
{
  "statusCode": 404,
  "errors": "File not found"
}
```

**Failed — version does not belong to this file `403`:**
```json
{
  "statusCode": 403,
  "errors": "Version does not belong to this file"
}
```

---

## Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/s3/files/:file_id/share` | JWT | Presigned public share URL (current version) |
| `POST` | `/api/s3/files/:file_id/versions/:version_id/share` | JWT | Presigned public share URL (specific version) |

---

## Notes

- Both endpoints generate **presigned URLs** — the API is not in the data path.
- RustFS is never exposed directly to the client; the URL is signed and time-limited.
- For large video files, presigned URLs are preferred over server-side streaming to avoid memory pressure on the API server.