# Bull Dashboard Spec

New features will be added once the files, uploads, user interface, and frontend of Selphos are complete

---

## Overview

Bull Dashboard is an admin-only UI for monitoring and managing BullMQ job queues.

> Access is restricted to users with `role = 'admin'` only.
> Non-admin requests will receive a `403 Forbidden` response.

---

## Setup

**Route:** `GET /admin/queues`

**Auth:** HTTP Basic Auth (username + password via environment variables)

```
BULL_DASHBOARD_USER=admin
BULL_DASHBOARD_PASSWORD=supersecret
```

> Basic Auth is used here instead of JWT because the dashboard is a browser UI,
> not a JSON API. JWT is not suitable for browser-based basic navigation.

---

## Queues Monitored

| Queue Name | Description |
|------------|-------------|
| `compression` | FFmpeg compression jobs for uploaded files |

---

## Job States Visible in Dashboard

| State | Description |
|-------|-------------|
| `waiting` | Job is queued, not yet picked up by a worker |
| `active` | Worker is currently processing the job |
| `completed` | Job finished successfully |
| `failed` | Job failed after all retry attempts |
| `delayed` | Job is waiting for retry backoff (exponential) |
| `paused` | Queue has been manually paused |

---

## Actions Available

| Action | Description |
|--------|-------------|
| Retry failed job | Re-queue a failed job manually |
| Remove job | Delete a job from the queue |
| Pause queue | Stop workers from picking up new jobs |
| Resume queue | Resume a paused queue |
| View job data | Inspect `job.data` and `job.stacktrace` |

---

## Job Data Shape (compression queue)

Each job in the `compression` queue contains the following data:

```json
{
  "version_id": "3d2a4b6c-1e5f-7890-ab12-cd34ef567890",
  "file_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "object_key": "uploads/raw/user-id/1234567890-photo.jpg",
  "bucket_raw": "my-bucket",
  "bucket_compressed": "my-bucket-compressed",
  "mime_type": "image/jpeg",
  "filename": "photo.jpg"
}
```

---

## Failed Response (non-admin access)

**`403`**
```json
{
  "statusCode": 403,
  "errors": "Forbidden"
}
```