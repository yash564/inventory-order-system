# Inventory & Order Management System

A full-stack, containerized Inventory & Order Management System for managing
**products, customers, orders, and inventory tracking**.

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL
- **Containerization:** Docker + Docker Compose

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project structure](#project-structure)
4. [Quick start (Docker Compose)](#quick-start-docker-compose)
5. [Local development (without Docker)](#local-development-without-docker)
6. [API reference](#api-reference)
7. [Business rules](#business-rules)
8. [Deployment](#deployment)
9. [Submission links](#submission-links)

---

## Features

**Products** – create, list, view, update, delete; SKU, price, stock tracking.
**Customers** – create, list, view, delete; unique email.
**Orders** – create multi-item orders, list, view details, cancel (with restock).
**Dashboard** – totals for products / customers / orders, low-stock list, revenue.
**UX** – responsive layout, modal forms, client + server validation, toast
notifications, loading/empty/error states.

---

## Architecture

```
Browser ──HTTP──> Frontend (nginx, React SPA)
                       │  (calls VITE_API_URL)
                       ▼
                  Backend (FastAPI / Uvicorn)  ──SQL──>  PostgreSQL
```

- The frontend is a static SPA served by nginx; it calls the backend directly
  via the `VITE_API_URL` baked in at build time.
- The backend exposes a REST API and talks to Postgres via SQLAlchemy.
- In Compose, the DB is reachable only on the internal network; the backend
  port `8000` and frontend port `5173` are published to the host.

---

## Project structure

```
inventory-order-system/
├── docker-compose.yml         # orchestrates db + backend + frontend
├── .env.example               # root env template (copy to .env)
├── backend/
│   ├── Dockerfile             # production backend image (python:3.12-slim, non-root)
│   ├── .dockerignore
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app, CORS, router wiring
│       ├── config.py          # env-driven settings
│       ├── database.py        # SQLAlchemy engine/session
│       ├── models/            # Product, Customer, Order, OrderItem
│       ├── schemas/           # Pydantic request/response models
│       └── routers/           # products, customers, orders endpoints
└── frontend/
    ├── Dockerfile             # multi-stage build → nginx
    ├── nginx.conf             # SPA fallback + asset caching
    ├── .dockerignore
    ├── .env.example
    ├── package.json
    └── src/
        ├── api/               # axios client + resource wrappers
        ├── components/        # Layout, Modal, States, PageHeader
        ├── context/           # ToastContext (notifications)
        └── pages/             # Dashboard, Products, Customers, Orders, OrderDetail
```

---

## Quick start (Docker Compose)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose v2).

```bash
# 1. Clone
git clone https://github.com/yash564/inventory-order-system.git
cd inventory-order-system

# 2. Create your env file (defaults work out of the box for local use)
cp .env.example .env

# 3. Build and run everything
docker compose up --build -d

# 4. Open the apps
#    Frontend:  http://localhost:5173
#    API docs:  http://localhost:8000/docs
```

Stop the stack:

```bash
docker compose down          # keep data
docker compose down -v       # also wipe the Postgres volume
```

> **Credentials are never hardcoded.** Postgres user/password/db come from
> `.env` (defaults provided for local dev only). Data persists in the named
> volume `pgdata`.

---

## Local development (without Docker)

**Backend** (Python 3.10+):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory
uvicorn app.main:app --reload
```

**Frontend** (Node 18+):

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev      # http://localhost:5173
```

---

## API reference

Base URL: `http://localhost:8000` · Interactive docs at `/docs`.

### Products
| Method | Path             | Description            |
|--------|------------------|------------------------|
| POST   | `/products`      | Create a product       |
| GET    | `/products`      | List all products      |
| GET    | `/products/{id}` | Get one product        |
| PUT    | `/products/{id}` | Update a product       |
| DELETE | `/products/{id}` | Delete a product       |

`{ "name", "sku", "price", "quantity" }`

### Customers
| Method | Path              | Description           |
|--------|-------------------|-----------------------|
| POST   | `/customers`      | Create a customer     |
| GET    | `/customers`      | List all customers    |
| GET    | `/customers/{id}` | Get one customer      |
| DELETE | `/customers/{id}` | Delete a customer     |

`{ "full_name", "email", "phone" }`

### Orders
| Method | Path           | Description                         |
|--------|----------------|-------------------------------------|
| POST   | `/orders`      | Create an order (reduces stock)     |
| GET    | `/orders`      | List all orders                     |
| GET    | `/orders/{id}` | Get order details (+ customer)      |
| DELETE | `/orders/{id}` | Cancel an order (restocks products) |

```json
{ "customer_id": 1, "items": [ { "product_id": 1, "quantity": 3 } ] }
```

The backend computes `total_amount` automatically and snapshots each line's
unit price at order time.

---

## Business rules

| Rule | Enforcement |
|------|-------------|
| Product SKU is unique | DB unique constraint → `409 Conflict` |
| Customer email is unique | DB unique constraint → `409 Conflict` |
| Quantity cannot be negative | Pydantic `ge=0` + DB `CHECK` → `422` |
| Orders blocked on insufficient stock | Pre-commit stock check → `409 Conflict` |
| Creating an order reduces stock | Done atomically in one transaction |
| Cancelling an order restores stock | Done on delete |
| Total amount computed by backend | `Σ unit_price × quantity` |
| Validation + proper status codes | `201/204/404/409/422` as appropriate |

---

## Deployment

The app is designed for free hosting tiers. See
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for full step-by-step instructions covering:

- **Backend → Render** (Docker image) + **managed Postgres**
- **Frontend → Vercel** (static build, `VITE_API_URL` pointing at the backend)
- **Docker Hub** image push for the backend

---

## Submission links

| Deliverable            | Link |
|------------------------|------|
| GitHub repository      | `https://github.com/yash564/inventory-order-system` |
| Docker Hub (backend)   | `https://hub.docker.com/r/yash564/inventory-backend` |
| Live frontend URL      | _add after deploying to Vercel_ |
| Live backend API URL   | _add after deploying to Render_ |
```
