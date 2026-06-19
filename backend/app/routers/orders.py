from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import Customer, Order, OrderItem, Product
from ..schemas.order import OrderCreate, OrderDetailOut, OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


def _serialize_item(item: OrderItem) -> dict:
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": item.product.name if item.product else "(deleted product)",
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "line_total": item.unit_price * item.quantity,
    }


def _serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "items": [_serialize_item(i) for i in order.items],
    }


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    # 1. Customer must exist.
    customer = db.get(Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {payload.customer_id} not found",
        )

    # 2. Collapse duplicate product lines so stock checks are accurate.
    requested: dict[int, int] = {}
    for line in payload.items:
        requested[line.product_id] = requested.get(line.product_id, 0) + line.quantity

    # 3. Validate every product exists and has enough stock before mutating anything.
    products = (
        db.query(Product).filter(Product.id.in_(requested.keys())).all()
        if requested
        else []
    )
    products_by_id = {p.id: p for p in products}

    missing = [pid for pid in requested if pid not in products_by_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product(s) not found: {', '.join(map(str, missing))}",
        )

    for product_id, qty in requested.items():
        product = products_by_id[product_id]
        if product.quantity < qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for '{product.name}': "
                    f"requested {qty}, available {product.quantity}"
                ),
            )

    # 4. All checks passed — create the order, reduce stock, compute total.
    order = Order(customer_id=customer.id, total_amount=0)
    total = 0
    for product_id, qty in requested.items():
        product = products_by_id[product_id]
        product.quantity -= qty
        order.items.append(
            OrderItem(
                product_id=product.id,
                quantity=qty,
                unit_price=product.price,
            )
        )
        total += product.price * qty

    order.total_amount = total
    db.add(order)
    db.commit()
    db.refresh(order)
    return _serialize_order(order)


@router.get("", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .all()
    )
    return [_serialize_order(o) for o in orders]


@router.get("/{order_id}", response_model=OrderDetailOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.customer),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    data = _serialize_order(order)
    data["customer"] = order.customer
    return data


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel/delete an order and restock the products it consumed."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )

    # Return the reserved stock to inventory before deleting the order.
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product is not None:
            product.quantity += item.quantity

    db.delete(order)
    db.commit()
    return None
