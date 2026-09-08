# Deployment Guide — Azure App Service

This guide walks you through deploying the OTT platform to **Azure App Service
(Linux, Node 20 LTS)**. The backend is not a separate server: it runs *inside*
Next.js as App Router API routes (`src/app/api/**/route.ts`), so deploying the
Next.js app deploys the API too.

Two deployment paths are covered:

- **Path A — Code / standalone build** (App Service builds & runs the Node app).
- **Path B — Container** (App Service runs the provided `Dockerfile`).

Path B (container) is the most reliable because the `Dockerfile` pins the
runtime and port. Use whichever suits you; both are described below.

> **Important:** the app must run on the **Node.js runtime**, not the Edge
> runtime, and it is **not statically exportable**. Several routes use
> `node:crypto` for session/auth and set `export const dynamic = "force-dynamic"`.

---

## 1. Prerequisites

Before you start, make sure you have:

1. **An Azure account** with permission to create an App Service.
2. **An Azure Storage account** for video files (Blob storage). The design uses
   a **private container** plus short-lived **SAS** URLs for playback — do not
   make the container public. Note the account name, a connection string, and
   the container name you want to use (default in `.env.example` is
   `ott-content`).
3. **A MongoDB connection string** — either
   [MongoDB Atlas](https://www.mongodb.com/atlas) or
   **Azure Cosmos DB for MongoDB (vCore / RU)**. Copy the full `mongodb://` /
   `mongodb+srv://` connection string.
4. **A Cloudinary account** (used to auto-generate thumbnails). Note the cloud
   name, API key and API secret.
5. **A GitHub account** with push access to the repo (for the CI workflow).

---

## 2. Environment variables (Application Settings)

App Service injects these into the process environment. In the Portal go to
**App Service → Settings → Configuration → Application settings** and add each
of the following. This list is authoritative to `ott-platform/.env.example` —
keep them in sync.

| Setting | What it is | Example / note |
| --- | --- | --- |
| `AZURE_STORAGE_CONNECTION_STRING` | Connection string for the Storage account holding videos | from Portal → Storage account → Access keys |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name | e.g. `myottstorage` |
| `AZURE_STORAGE_CONTAINER` | Blob container name for content | `ott-content` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | from Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | keep secret |
| `MONGODB_URI` | MongoDB / Cosmos connection string | `mongodb+srv://...` |
| `NEXTAUTH_SECRET` | HMAC key that signs the session cookie | **generate** with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Public base URL of the deployed app | `https://<app-name>.azurewebsites.net` |
| `ADMIN_EMAIL` | Built-in admin login email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Built-in admin login password | strong, unique |
| `ADMIN_API_TOKEN` | Shared secret for write/upload APIs (`x-admin-token`) | strong random string |
| `NEXT_PUBLIC_APP_NAME` | Display name (exposed to browser) | `OTT Platform` |
| `NEXT_PUBLIC_APP_URL` | Public URL (exposed to browser) | `https://<app-name>.azurewebsites.net` |
| `WEBSITES_PORT` | Port App Service should route to | `8080` (must match the Dockerfile `EXPOSE`/`PORT`) |

Notes:

- **`NEXTAUTH_SECRET` is required.** If it is unset, every login (user login,
  registration, and admin login) fails closed — you will see 401s everywhere.
  Generate it once with `openssl rand -base64 32` and paste the value. Rotating
  it signs everyone out.
- **`NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`** should be the real HTTPS URL of the
  deployed site (your `azurewebsites.net` hostname or a custom domain).
- `NEXT_PUBLIC_*` values are baked into the client bundle at **build time**. For
  Path A (App Service builds on deploy) setting them as Application Settings is
  enough. For Path B (container), make sure they are set before `npm run build`
  runs in CI or pass them as build args if you customize the Dockerfile.
- Never commit real values. `.env`, `.env*.local` are gitignored; only
  `.env.example` (placeholders) is tracked.

---

## 3. Path A — Deploy the code / standalone build

Next.js is configured with `output: "standalone"` (see `next.config.js`), which
produces a self-contained server under `.next/standalone/server.js`.

### 3a. Create the App Service

1. Portal → **Create a resource → Web App**.
2. **Publish:** `Code`.
3. **Runtime stack:** `Node 20 LTS`.
4. **Operating System:** `Linux`.
5. Pick a region, plan (B1 or higher recommended), and a globally-unique
   **name** — this becomes `https://<name>.azurewebsites.net`.
6. Create.

### 3b. Configure

1. Add all the Application Settings from section 2.
2. Under **Configuration → General settings**, set the **Startup Command** to:
   ```
   node server.js
   ```
   (App Service starts from the deployed standalone output.)
3. Set `WEBSITES_PORT=8080` **only if** you pin `PORT=8080`; for the plain code
   path the standalone server listens on the App Service-provided `PORT`
   automatically, so `WEBSITES_PORT` is optional here. It is required for the
   container path (Path B).

### 3c. Deploy

Use the GitHub Actions workflow (section 5), or deploy from the CLI/zip. Because
the app uses `output: "standalone"`, the deployed package must be **assembled**
from the build output — copy `.next/standalone/*` to the package root, then add
`.next/static` and `public` alongside it. The workflow does this automatically.
The startup command must be `node server.js`.

---

## 4. Path B — Deploy as a container (recommended)

A multi-stage `Dockerfile` is provided. It builds the standalone output and
runs `node server.js` as a non-root user, listening on port `8080`.

### 4a. Build & push the image

Build and push to a registry (Azure Container Registry, GHCR, Docker Hub):

```bash
# from inside ott-platform/
docker build -t <registry>/ott-platform:latest .
docker push <registry>/ott-platform:latest
```

### 4b. Create the App Service (container)

1. Portal → **Create a resource → Web App**.
2. **Publish:** `Container`.
3. **Operating System:** `Linux`.
4. On the **Container** tab, point it at your image (`<registry>/ott-platform:latest`)
   and provide registry credentials if private.
5. Create.

### 4c. Configure

1. Add all the Application Settings from section 2, **including `WEBSITES_PORT=8080`**.
   The container `EXPOSE`s 8080 and the server binds to `process.env.PORT || 8080`,
   so App Service must route to 8080.
2. Save and restart.

---

## 5. Continuous deployment with GitHub Actions

A workflow is provided at `.github/workflows/main_operix.yml`. It runs on push
to `main` (and via manual **workflow_dispatch**), installs deps with
`npm install`, builds, runs the unit tests (best-effort), assembles the
standalone deployment package, and deploys with `azure/webapps-deploy@v3`
(setting the startup command to `node server.js`). The app lives at the repo
root, so no `working-directory` override is needed.

### 5a. Configure authentication (OIDC)

The workflow authenticates to Azure with **OpenID Connect** via `azure/login@v2`
(no publish-profile password stored). In the Portal, use **App Service →
Deployment Center → GitHub** to wire up the connection — this creates the
federated-identity app registration and populates the required secrets for you.

### 5b. Required GitHub secrets

The workflow references these repository secrets (created automatically when you
set up deployment from the Portal's Deployment Center):

| Secret | Value |
| --- | --- |
| `AZUREAPPSERVICE_CLIENTID_*` | client (application) ID of the federated identity |
| `AZUREAPPSERVICE_TENANTID_*` | Azure AD tenant ID |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | target subscription ID |

> The workflow references these only as `${{ secrets.* }}` — it never dumps the
> environment or logs secret values.

### 5c. Trigger

Push to `main`, or run the workflow manually from the **Actions** tab.

---

## 6. Secure video access (already handled)

You do **not** need to configure any public access on the Storage container. The
app keeps the Blob container **private** and issues **short-lived SAS URLs** for
playback only after the caller is authorized (e.g. an active 1-hour rental
unlock). Keep the container private; exposing it publicly would bypass this
protection.

---

## 7. Troubleshooting

- **App won't start / container keeps restarting** — confirm `WEBSITES_PORT`
  matches the port the server listens on (`8080` for the provided Dockerfile),
  and that the runtime is **Node.js**, not a static/Edge target. Check
  **Log stream** and **Deployment Center → Logs**.
- **401 Unauthorized everywhere (can't log in, register, or admin-login)** —
  `NEXTAUTH_SECRET` is unset or empty. Set it (`openssl rand -base64 32`) and
  restart.
- **Admin login fails (401)** — `ADMIN_EMAIL` and/or `ADMIN_PASSWORD` missing.
  Both must be set.
- **Uploads / write APIs rejected (401)** — provide a valid admin session or the
  `ADMIN_API_TOKEN` via the `x-admin-token` header.
- **Images/videos don't load** — check the Storage connection string, container
  name, and that `next.config.js` `images.remotePatterns` still allowlists your
  Blob host (`*.blob.core.windows.net`) and Cloudinary.
- **Database connection errors** — verify `MONGODB_URI` and that the App
  Service outbound IPs are allowed in your MongoDB Atlas / Cosmos firewall.
