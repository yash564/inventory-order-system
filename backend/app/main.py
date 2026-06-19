from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import customers, orders, products

# Create tables on startup. For a small assessment app this is sufficient;
# a larger system would use Alembic migrations instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    description="Manage products, customers, orders and inventory tracking.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "inventory-order-management"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
