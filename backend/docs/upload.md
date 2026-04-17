# Upload API Spec

## Initiate Upload
**Endpoint:** `POST /api/s3/uploads/initiate`

**Headers:**
```
- authorization: access_token
```

**Request Body:**
```json
{
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "size": 2048576,
  "file_id": "optional-existing-uuid"
}
```

> `file_id` is optional. Provide it only when uploading a new version of an existing file. Omit it for a brand-new file.

**Request Body Success:**
```json
{
  "data": {
    "upload_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "presigned_url": "http://localhost:9000/my-bucket/uploads/raw/.../photo.jpg?X-Amz-Signature=...",
    "expires_at": "2025-01-01T12:15:00.000Z"
  }
}
```

> `presigned_url` is valid for **15 minutes**. After that, a new initiate request is required.

**Failed — validation error `400`:**
```json
{
  "statusCode": 400,
  "errors": "mime_type is required"
}
```

**Failed — unauthorized `401`:**
```json
{
  "statusCode": 401,
  "errors": "Access token invalid"
}
```

---

## Direct PUT to RustFS

> This step is performed **by the client directly to RustFS**. The API is not involved at all.

```
PUT {presigned_url}
Content-Type: image/jpeg
Body: <raw file bytes>
```

**Response from RustFS `200`:**
```
ETag: "...."
```

Save the `ETag` value — it will be used in Step 3 for integrity verification.

---

## Confirm Upload

Notify the API that the upload is complete. The API will save the `file_version` to the database and queue a compression job if the file type is compressible.

**Endpoint:** `POST /api/s3/uploads/:upload_id/confirm`

**Headers:**
```
- authorization: access_token
```

**Request Body:**
```json
{
  "filename": "photo.jpg",
  "mime_type": "image/jpeg",
  "size": 2048576,
  "etag": "686897696a7c876b7e"
}
```

> `etag` is optional but recommended for integrity checking.

**Request Body Success:**
```json
{
  "data": {
    "version_id": "3d2a4b6c-1e5f-7890-ab12-cd34ef567890",
    "compression_status": "pending"
  }
}
```

**`compression_status` values at confirm:**

| Value | Meaning |
|-------|---------|
| `pending` | File is compressible (image/video), job has been queued |
| `skipped` | File type is not compressible (PDF, ZIP, etc.), no job queued |

**Failed — upload not found :**
```json
{
  "statusCode": 404,
  "errors": "Upload not found"
}
```

**Request Body Failed — upload already confirmed :**
```json
{
  "statusCode": 409,
  "errors": "Upload already confirmed"
}
```

**Request Body Failed — upload has expired :**
```json
{
  "statusCode": 410,
  "errors": "Upload has expired"
}
```

---

## Get Upload Status

Poll this endpoint after Step 3 to track compression progress.

**Endpoint:** `GET /api/s3/uploads/:upload_id/status`

**Headers:**
```
- authorization: access_token
```

**Request Body Success:**
```json
{
  "data": {
    "upload_id": "550e8400-e29b-41d4-a716-446655440000",
    "upload_status": "COMPLETED",
    "version_id": "3d2a4b6c-1e5f-7890-ab12-cd34ef567890",
    "compression_status": "done",
    "created_at": "2025-01-01T12:00:00.000Z",
    "updated_at": "2025-01-01T12:00:45.000Z"
  }
}
```

**`upload_status` values (from the `uploads` table):**

| Status | Meaning |
|--------|---------|
| `INITIATED` | Presigned URL has been generated, client has not started uploading yet |
| `UPLOADING` | Client is currently PUT-ing to RustFS |
| `COMPLETED` | Confirm has been called, file is saved |
| `FAILED` | Upload failed or expired |

**`compression_status` values (from the `file_versions` table):**

| Status | Meaning |
|--------|---------|
| `pending` | Job is queued, worker has not picked it up yet |
| `processing` | Worker is actively compressing |
| `done` | Compressed file is ready, `compressed_object_key` is populated |
| `failed` | Compression failed, raw file is still served |
| `skipped` | File type is not compressible |

**Request Body Failed — not found:**
```json
{
  "statusCode": 404,
  "errors": "Upload not found"
}
```

