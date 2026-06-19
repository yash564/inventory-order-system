# Deployment Guide

This guide deploys the system on free tiers:

- **Backend** → Render (Docker) + Render managed PostgreSQL
- **Frontend** → Vercel
- **Backend image** → Docker Hub

> Replace `yash564` with your own usernames where they appear.

---

## 0. Push the code to GitHub

```bash
cd inventory-order-system
git add .
git commit -m "Inventory & Order Management System"
git branch -M main
git remote add origin https://github.com/yash564/inventory-order-system.git
git push -u origin main
```

---

## 1. Push the backend image to Docker Hub

```bash
# Log in (create a free account at hub.docker.com first)
docker login

# Build for the standard linux/amd64 platform most hosts use
docker build --platform linux/amd64 -t yash564/inventory-backend:latest ./backend

docker push yash564/inventory-backend:latest
```

Your image link: `https://hub.docker.com/r/yash564/inventory-backend`

---

## 2. Database — Render PostgreSQL (free)

1. Render Dashboard → **New** → **PostgreSQL**.
2. Name it `inventory-db`, pick the **Free** plan, create it.
3. When ready, copy the **Internal Database URL** (starts with
   `postgresql://...`). You'll give this to the backend.

> Render's free Postgres URL works directly with this app — `DATABASE_URL` is
> the only DB setting the backend needs.

---

## 3. Backend — Render Web Service (free)

You can deploy either from the GitHub repo or from the Docker Hub image.

**Option A – from the repo (recommended):**
1. Render → **New** → **Web Service** → connect your GitHub repo.
2. **Root Directory:** `backend`
3. **Runtime:** Docker (Render auto-detects the `Dockerfile`).
4. **Environment variables:**
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | _the Internal Database URL from step 2_ |
   | `CORS_ORIGINS` | _your Vercel URL, e.g._ `https://inventory-order-system.vercel.app` |
5. Create the service. Render injects `$PORT`, which the Dockerfile honors.
6. After deploy, note the public URL, e.g.
   `https://inventory-backend.onrender.com`. Check `/health` and `/docs`.

**Option B – from Docker Hub:** choose **Deploy an existing image** and use
`docker.io/yash564/inventory-backend:latest`, then set the same env vars.

> Free Render services sleep when idle; the first request after a while may
> take ~30–60s to wake.

---

## 4. Frontend — Vercel (free)

1. Vercel → **Add New** → **Project** → import the GitHub repo.
2. **Root Directory:** `frontend`
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output dir `dist`.
4. **Environment variable:**
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | _your Render backend URL, e.g._ `https://inventory-backend.onrender.com` |
5. Deploy. Vercel gives you a URL like
   `https://inventory-order-system.vercel.app`.

> `VITE_API_URL` is read at **build time**. If you change it later, trigger a
> redeploy.

---

## 5. Wire up CORS

After the frontend is live, make sure the backend's `CORS_ORIGINS` env var on
Render equals the exact Vercel URL (no trailing slash), then redeploy the
backend. This lets the browser call the API without CORS errors.

---

## 6. Verify the live system

```bash
# Backend health
curl https://inventory-backend.onrender.com/health

# Create a product against the live API
curl -X POST https://inventory-backend.onrender.com/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","sku":"T-1","price":5,"quantity":10}'
```

Then open the Vercel URL, add a product/customer, and place an order.

---

## Netlify alternative (frontend)

If you prefer Netlify over Vercel:
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Environment variable: `VITE_API_URL=https://inventory-backend.onrender.com`
- Add a redirect for SPA routing — create `frontend/public/_redirects`:
  ```
  /*  /index.html  200
  ```
