# Pixel-Safe Backend API Endpoints

Base URL (development): `http://127.0.0.1:8000/`
All API endpoints are prefixed with `/api/` (see `core/urls.py`).

## Authentication

- JWT-based (SimpleJWT)
- Obtain tokens via POST `/api/token/` with `{ "username": "...", "password": "..." }`.
  - Response contains `access` and `refresh` tokens.
- Add header to authenticated requests:
  - `Authorization: Bearer <access_token>`

## Notes

- Many endpoints require `Authorization` header (see below).
- File uploads require `multipart/form-data` (use `image` as the field name for images in places where files are expected).
- Media files (images, PDFs) are served at the MEDIA URL (e.g., `/media/...`). Ensure Django `MEDIA_URL` and `MEDIA_ROOT` are configured when hosting.

## Endpoints

## Users

- POST `/api/signup/` ✅ (public)

  - Description: Create a new user.
  - Body (JSON): `{ "username": "...", "password": "...", "email": "..." }` (password write-only)
  - Response: `201 Created` with created user fields (no password returned).

- POST `/api/token/` ✅ (public)

  - Description: Login — obtain JWT tokens.
  - Body (JSON): `{ "username": "...", "password": "..." }`
  - Response: `{ "access": "<token>", "refresh": "<token>" }`

- POST `/api/token/refresh/` ✅ (public)
  - Description: Refresh access token.
  - Body (JSON): `{ "refresh": "<refresh_token>" }`
  - Response: `{ "access": "<new_access_token>" }`

## Image / Batch API (imageapp)

Routes registered via DRF router at `/api/images/` and `/api/batches/`.
All require Authorization: Bearer <token> (IsAuthenticated).

Images

- GET `/api/images/` ✅

  - Description: List images for authenticated user.
  - Response: list of image objects (see serializer).

- POST `/api/images/` ✅ (multipart)

  - Description: Upload single or multiple images.
  - Form fields:
    - `image` (file) — can provide multiple `image` fields to create a batch.
    - `batch_name` (optional string) — used if multiple images are uploaded.
  - Behavior:
    - If multiple files => a Batch is created and images are added with `batch_position`.
    - Returns created image(s) and batch metadata when applicable.

- GET `/api/images/{image_id}/` ✅

  - Description: Retrieve single image details (image_id is UUID stored in `ImageID`).

- PUT/PATCH `/api/images/{image_id}/` ✅

  - Description: Update image metadata.

- DELETE `/api/images/{image_id}/` ✅
  - Description: Delete the image (owned by user).

Batches

- GET `/api/batches/` ✅

  - Description: List batches for the user.

- POST `/api/batches/` ✅

  - Description: Create a batch (the view often auto-creates batch on multi-image upload).

- GET `/api/batches/{batch_id}/` ✅

  - Description: Retrieve batch details.

- PATCH/PUT `/api/batches/{batch_id}/` ✅

  - Description: Update batch fields.

- DELETE `/api/batches/{batch_id}/` ✅
  - Description: Delete a batch and its images (atomic, responds with counts).

Custom Batch actions (BatchViewSet)

- GET `/api/batches/{batch_id}/images/` ✅

  - Description: List images inside a batch (ordered by batch_position).

- GET `/api/batches/search/?name=<term>` ✅

  - Description: Search batches by name (query param `name`).

- GET `/api/batches/stats/` ✅

  - Description: Return counts: total batches, total batch images, largest batch, recent batches.

- PATCH `/api/batches/{batch_id}/rename/` ✅
  - Description: Rename a batch. Body: `{ "new_name": "..." }`.

## Watermark API

All watermark endpoints are under `/api/watermark/...` and require `Authorization: Bearer <token>`.

- POST `/api/watermark/apply/` ✅

  - Description: Apply watermark to an existing image owned by the user.
  - Body/fields: Accepts JSON or form data; requires `image_id` (UUID) of an existing image.
  - Response: JSON with watermark record metadata and `watermarked_image` URL.

- POST `/api/watermark/verify/` ✅ (multipart)

  - Description: Verify a suspicious image against a watermark record or image.
  - Form fields:
    - `image` (file) — REQUIRED for verification
    - Optionally `watermark_id` or `image_id` (to identify the original record)
  - Response: JSON verification result: status, confidence, metrics, overlay URLs, and resulting Report references.

- POST `/api/watermark/auto-verify/` ✅ (multipart)
  - Description: Auto-detect watermark and verify without providing watermark id; upload suspicious `image` file.
  - Response: JSON with detection result, verification response, overlay URLs, and suggestions if detection failed.

## Report API (reportapp)

Routes registered via DRF at `/api/reports/`. All require `Authorization: Bearer <token>`.

Reports standard actions

- GET `/api/reports/` ✅

  - List reports for the user.

- POST `/api/reports/` ✅

  - Create a new Report record (rare, the view usually generates reports via actions below).

- GET `/api/reports/{report_id}/` ✅

  - Retrieve report metadata.

- PATCH/PUT `/api/reports/{report_id}/` ✅

  - Update report fields.

- DELETE `/api/reports/{report_id}/` ✅
  - Delete report record and attached files (if present).

Custom Report actions

- POST `/api/reports/generate/` ✅

  - Description: Generate a report for a single image and return the PDF inline.
  - Body (JSON or form): `{ "image_id": "<image-uuid>", "force": true|false (optional) }`
  - Response: `application/pdf` (inline-by-default). Contains `X-Report-ID` header for convenience.

- POST `/api/reports/generate_batch/` ✅

  - Description: Generate reports for all images in a batch and return a ZIP (inline).
  - Body: `{ "batch_id": "<batch-uuid>" }`
  - Response: `application/zip` (inline). Filename in `Content-Disposition`.

- POST `/api/reports/download_batch/` ✅

  - Description: Download ZIP of all existing reports for images in a batch.
  - Body: `{ "batch_id": "<batch-uuid>" }`
  - Response: `application/zip` (attachment) for download.

- GET `/api/reports/{report_id}/download/` ✅
  - Description: Force-download single report PDF (attachment).
  - Response: `application/pdf` with `Content-Disposition: attachment`.

## Media URLs and file access

- Uploaded images, watermarked images, and PDFs are available through Django's media serving when running the app.
- Example file URL from a model field may look like: `http://127.0.0.1:8000/media/reports/pdf/report-<uuid>.pdf`
