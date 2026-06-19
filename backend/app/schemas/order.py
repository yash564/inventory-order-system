from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from .customer import CustomerOut


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: int
    customer_id: int
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemOut]

    model_config = ConfigDict(from_attributes=True)


class OrderDetailOut(OrderOut):
    customer: CustomerOut
