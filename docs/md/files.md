# Files Management API Spec

## List All Files

**Endpoint:** `GET /api/s3/files`

**Headers:**
```
- authorization: access_token
```

**Query Parameters (optional):**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `mime_type` | string | — | Filter by mime type, e.g. `image/jpeg` |

**Request Body Success:**
```json
{
  "data": {
    "files": [
      {
        "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "filename": "photo.jpg",
        "mime_type": "image/jpeg",
        "size": 2048576,
        "compression_status": "done",
        "version_count": 3,
        "created_at": "2025-01-01T12:00:00.000Z",
        "updated_at": "2025-01-01T12:00:45.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

> Only returns files belonging to the currently logged-in user (`user_id` from token). Files with `is_deleted = true` are excluded.

---

## Get File Versions

Retrieve all versions of a file. Useful for rollback purposes.

**Endpoint:** `GET /api/s3/files/:file_id/versions`

**Headers:**
```
- authorization: access_token
```

**Request Body Success:**
```json
{
  "data": {
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "filename": "photo.jpg",
    "versions": [
      {
        "version_id": "3d2a4b6c-1e5f-7890-ab12-cd34ef567890",
        "is_current": true,
        "object_key": "uploads/raw/7c9e.../photo.jpg",
        "compressed_object_key": "uploads/compressed/7c9e.../photo.webp",
        "compression_status": "done",
        "mime_type": "image/jpeg",
        "size": 2048576,
        "etag": "686897696a7c876b7e",
        "created_at": "2025-01-02T09:00:00.000Z"
      },
      {
        "version_id": "1a2b3c4d-5e6f-7890-ab12-cd34ef567890",
        "is_current": false,
        "object_key": "uploads/raw/7c9e.../photo_v1.jpg",
        "compressed_object_key": "uploads/compressed/7c9e.../photo_v1.webp",
        "compression_status": "done",
        "mime_type": "image/jpeg",
        "size": 1890432,
        "etag": "abc123def456",
        "created_at": "2025-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

> `is_current = true` indicates the active version, matching `files.current_version_id`.
> If `compression_status` is `pending`, `processing`, or `failed`, then `compressed_object_key` will be `null`.

**Request Body Failed — file not found:**
```json
{
  "statusCode": 404,
  "errors": "File not found"
}
```

---

## Get Download URL
Generate a presigned GET URL for downloading the active (current) version of a file.
**Endpoint:** `GET /api/s3/files/:file_id/download`
**Headers:**
```
- authorization: access_token
```
**Request Body Success:**
```json
{
  "data": {
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "filename": "photo.jpg",
    "download_url": "http://localhost:9000/my-bucket/uploads/compressed/.../photo.webp?X-Amz-Signature=...",
    "expires_at": "2025-01-01T13:00:00.000Z",
    "mime_type": "image/jpeg",
    "size": 2048576
  }
}
```

> If `compression_status` is `pending`, `processing`, or `failed`, the URL will point to the raw file (`object_key`) instead of `compressed_object_key`.

**Request Body Failed — file not found:**
```json
{
  "statusCode": 404,
  "errors": "File not found"
}
```
**Request Body Failed — file has been deleted:**
```json
{
  "statusCode": 410,
  "errors": "File has been deleted"
}
```

---

## Restore File Version
Set a specific version as the active version. This updates `files.current_version_id`.
**Endpoint:** `POST /api/s3/files/:file_id/versions/:version_id/restore`

**Headers:**
```
- authorization: access_token
```

**Request Body:** *(empty)*

**Request Body Success:**
```json
{
  "data": {
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "restored_version_id": "1a2b3c4d-5e6f-7890-ab12-cd34ef567890",
    "message": "File restored to selected version"
  }
}
```

**Request Body Failed — version not found :**
```json
{
  "statusCode": 404,
  "errors": "Version not found"
}
```

**Request Body Failed — version does not belong to this file :**
```json
{
  "statusCode": 403,
  "errors": "Version does not belong to this file"
}
```

---

## Delete File (Soft Delete)
Mark a file as deleted by setting `is_deleted = true` in the `files` table. The file is **not** removed from RustFS.
**Endpoint:** `DELETE /api/s31/files/:file_id`

**Headers:**
```
- authorization: access_token
```

**Request Body Success :**
```json
{
  "data": true
}
```

**Request Body Failed — file not found :**
```json
{
  "statusCode": 404,
  "errors": "File not found"
}
```

**Request Body Failed — file is already deleted :**
```json
{
  "statusCode": 409,
  "errors": "File is already deleted"
}
```