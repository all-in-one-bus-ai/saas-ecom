"""
ShopStack payments backend.

Hosts the Stripe payment endpoints used by the Next.js frontend:
  - POST /api/payments/subscription/checkout  -> tenant plan upgrade
  - POST /api/payments/shop/checkout          -> shopper cart checkout
  - GET  /api/payments/status/{session_id}    -> poll payment status
  - POST /api/webhook/stripe                  -> Stripe webhook events
  - GET  /api/health

Uses emergentintegrations.payments.stripe.checkout.StripeCheckout because the
test key `sk_test_emergent` only resolves through that wrapper.

Persists a `payment_transactions` collection in MongoDB (immutable ledger of
intents). On payment success we ALSO update Supabase: tenants.plan for
subscriptions, and inserts an orders + order_items row for shopper checkouts.
"""

import os
import re
import logging
from typing import List, Optional, Literal
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("shopstack.payments")

# ----- Config -----------------------------------------------------------
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "shopstack_payments")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Fixed server-side plan prices (USD). Never trust client.
PLAN_PRICES = {
    "starter": 29.00,
    "professional": 99.00,
    "enterprise": 299.00,
}

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)

mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

app = FastAPI(title="ShopStack Payments")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- Models -----------------------------------------------------------
class SubscriptionCheckoutBody(BaseModel):
    tenant_id: str
    plan: Literal["starter", "professional", "enterprise"]
    origin_url: str


class ShopItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(gt=0)


class ShopCheckoutBody(BaseModel):
    tenant_slug: str
    items: List[ShopItem]
    customer_email: str
    origin_url: str


# ----- Supabase REST helper --------------------------------------------
def sb_headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def sb_get(path: str, params: Optional[dict] = None):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=sb_headers(), params=params)
        r.raise_for_status()
        return r.json()


async def sb_post(path: str, body):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{SUPABASE_URL}/rest/v1/{path}", headers=sb_headers(), json=body)
        r.raise_for_status()
        return r.json()


async def sb_patch(path: str, params: dict, body):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.patch(f"{SUPABASE_URL}/rest/v1/{path}", headers=sb_headers(), params=params, json=body)
        r.raise_for_status()
        return r.json()


async def sb_rpc(name: str, body):
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{SUPABASE_URL}/rest/v1/rpc/{name}", headers=sb_headers(), json=body)
        r.raise_for_status()
        return r.json()


# ----- Stripe key resolution -------------------------------------------
async def resolve_stripe_key(tenant_id: Optional[str]) -> str:
    """If tenant has overridden stripe_secret_key in store_settings, use it.
    Otherwise fall back to platform key (sk_test_emergent)."""
    if not tenant_id:
        return STRIPE_API_KEY
    try:
        rows = await sb_get(
            "store_settings",
            params={"tenant_id": f"eq.{tenant_id}", "key": "eq.stripe_secret_key", "select": "value"},
        )
        if rows and rows[0].get("value"):
            return rows[0]["value"]
    except Exception as e:
        log.warning("Failed to read tenant stripe key, falling back: %s", e)
    return STRIPE_API_KEY


def make_checkout(api_key: str, host_url: str) -> StripeCheckout:
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


# ----- Health -----------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "shopstack-payments"}


@app.get("/api/")
async def root():
    return {"service": "shopstack-payments", "endpoints": [
        "/api/payments/subscription/checkout",
        "/api/payments/shop/checkout",
        "/api/payments/status/{session_id}",
        "/api/webhook/stripe",
        "/api/health",
    ]}


# ----- Tenant subscription checkout ------------------------------------
@app.post("/api/payments/subscription/checkout")
async def subscription_checkout(body: SubscriptionCheckoutBody, request: Request):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(400, "Invalid plan")

    if not UUID_RE.match(body.tenant_id):
        raise HTTPException(400, "Invalid tenant_id")

    # Verify tenant exists
    rows = await sb_get("tenants", params={"id": f"eq.{body.tenant_id}", "select": "id,name,slug"})
    if not rows:
        raise HTTPException(404, "Tenant not found")
    tenant = rows[0]

    amount = float(PLAN_PRICES[body.plan])

    # ALWAYS use platform key for tenant subscriptions (revenue goes to platform)
    host_url = str(request.base_url)
    checkout = make_checkout(STRIPE_API_KEY, host_url)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/store/{tenant['slug']}/admin/billing?cancelled=1"

    metadata = {
        "kind": "subscription",
        "tenant_id": tenant["id"],
        "tenant_slug": tenant["slug"],
        "plan": body.plan,
    }

    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "kind": "subscription",
        "tenant_id": tenant["id"],
        "tenant_slug": tenant["slug"],
        "amount": amount,
        "currency": "usd",
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "credited": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    return {"url": session.url, "session_id": session.session_id}


# ----- Shopper checkout -------------------------------------------------
@app.post("/api/payments/shop/checkout")
async def shop_checkout(body: ShopCheckoutBody, request: Request):
    if not body.items:
        raise HTTPException(400, "Cart is empty")

    # Resolve tenant
    rows = await sb_get(
        "tenants",
        params={"slug": f"eq.{body.tenant_slug}", "status": "eq.active", "select": "id,name,slug"},
    )
    if not rows:
        raise HTTPException(404, "Tenant not found or inactive")
    tenant = rows[0]

    # Load products (price authoritatively from DB)
    product_ids = list({i.product_id for i in body.items})
    products = await sb_get(
        "products",
        params={
            "id": f"in.({','.join(product_ids)})",
            "tenant_id": f"eq.{tenant['id']}",
            "status": "eq.active",
            "select": "id,name,price,images",
        },
    )
    price_map = {p["id"]: p for p in products}

    line_items_meta = []
    subtotal = 0.0
    for it in body.items:
        p = price_map.get(it.product_id)
        if not p:
            raise HTTPException(400, f"Product {it.product_id} unavailable")
        unit = float(p["price"])
        total = unit * it.quantity
        subtotal += total
        line_items_meta.append({
            "product_id": p["id"],
            "name": p["name"],
            "unit_price": unit,
            "quantity": it.quantity,
            "total": total,
            "image": (p.get("images") or [{}])[0].get("url", "") if isinstance(p.get("images"), list) else "",
        })

    if subtotal <= 0:
        raise HTTPException(400, "Invalid cart total")

    amount = round(subtotal, 2)

    # Use per-tenant key if configured, else platform key
    api_key = await resolve_stripe_key(tenant["id"])
    host_url = str(request.base_url)
    checkout = make_checkout(api_key, host_url)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/{tenant['slug']}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/{tenant['slug']}/cart"

    metadata = {
        "kind": "shop",
        "tenant_id": tenant["id"],
        "tenant_slug": tenant["slug"],
        "customer_email": body.customer_email,
    }

    req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "kind": "shop",
        "tenant_id": tenant["id"],
        "tenant_slug": tenant["slug"],
        "amount": amount,
        "currency": "usd",
        "customer_email": body.customer_email,
        "line_items": line_items_meta,
        "metadata": metadata,
        "payment_status": "initiated",
        "status": "open",
        "credited": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })

    return {"url": session.url, "session_id": session.session_id}


# ----- Status (polled by frontend success page) ------------------------
@app.get("/api/payments/status/{session_id}")
async def status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        raise HTTPException(404, "Unknown session")

    # If already credited, just return cached
    if txn.get("credited"):
        return {
            "status": txn.get("status", "complete"),
            "payment_status": txn.get("payment_status", "paid"),
            "amount_total": int(round(txn["amount"] * 100)),
            "currency": txn["currency"],
            "metadata": txn.get("metadata", {}),
            "credited": True,
        }

    # Ask Stripe
    api_key = STRIPE_API_KEY
    if txn.get("kind") == "shop":
        api_key = await resolve_stripe_key(txn.get("tenant_id"))

    host_url = str(request.base_url)
    checkout = make_checkout(api_key, host_url)
    cs = await checkout.get_checkout_status(session_id)

    update = {
        "status": cs.status,
        "payment_status": cs.payment_status,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # Credit only once
    if cs.payment_status == "paid" and not txn.get("credited"):
        await _credit_transaction(session_id)

    return {
        "status": cs.status,
        "payment_status": cs.payment_status,
        "amount_total": cs.amount_total,
        "currency": cs.currency,
        "metadata": cs.metadata,
        "credited": cs.payment_status == "paid",
    }


async def _credit_transaction(session_id: str):
    """Idempotent: marks credited=True and performs Supabase side effects."""
    res = await db.payment_transactions.find_one_and_update(
        {"session_id": session_id, "credited": {"$ne": True}},
        {"$set": {"credited": True, "credited_at": datetime.now(timezone.utc)}},
    )
    if not res:
        return  # already credited

    md = res.get("metadata", {})
    kind = md.get("kind") or res.get("kind")

    try:
        if kind == "subscription":
            tenant_id = md.get("tenant_id")
            plan = md.get("plan")
            if tenant_id and plan:
                await sb_patch(
                    "tenants",
                    params={"id": f"eq.{tenant_id}"},
                    body={"plan": plan},
                )
                # Upsert into subscriptions table (no unique constraint on tenant_id, so check-then-update/insert)
                existing = await sb_get(
                    "subscriptions",
                    params={"tenant_id": f"eq.{tenant_id}", "select": "id"},
                )
                sub_body = {
                    "plan": plan,
                    "status": "active",
                    "current_period_start": datetime.now(timezone.utc).isoformat(),
                }
                if existing:
                    await sb_patch(
                        "subscriptions",
                        params={"tenant_id": f"eq.{tenant_id}"},
                        body=sub_body,
                    )
                else:
                    await sb_post(
                        "subscriptions",
                        [{"tenant_id": tenant_id, **sub_body}],
                    )
        elif kind == "shop":
            tenant_id = md.get("tenant_id")
            email = md.get("customer_email") or res.get("customer_email")
            line_items = res.get("line_items", [])
            amount = res.get("amount", 0.0)

            order_number = await sb_rpc("generate_order_number", {"p_tenant_id": tenant_id})
            if isinstance(order_number, list):
                order_number = order_number[0] if order_number else f"ORD-{int(datetime.now().timestamp())}"

            order_rows = await sb_post(
                "orders",
                [{
                    "tenant_id": tenant_id,
                    "order_number": str(order_number),
                    "status": "processing",
                    "payment_status": "paid",
                    "subtotal": amount,
                    "total_amount": amount,
                    "currency": "USD",
                    "notes": f"Stripe session {session_id} · {email}",
                    "stripe_payment_intent_id": session_id,
                }],
            )
            order_id = order_rows[0]["id"]

            if line_items:
                await sb_post(
                    "order_items",
                    [
                        {
                            "order_id": order_id,
                            "tenant_id": tenant_id,
                            "product_name": li["name"],
                            "quantity": li["quantity"],
                            "unit_price": li["unit_price"],
                            "total_price": li["total"],
                            "product_image": li.get("image", ""),
                        }
                        for li in line_items
                    ],
                )

            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"order_id": order_id, "order_number": str(order_number)}},
            )
    except Exception as e:
        log.exception("credit failed for %s: %s", session_id, e)


# ----- Webhook ----------------------------------------------------------
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")

    host_url = str(request.base_url)
    checkout = make_checkout(STRIPE_API_KEY, host_url)

    try:
        evt = await checkout.handle_webhook(body, signature)
    except Exception as e:
        log.warning("Webhook verification failed: %s", e)
        raise HTTPException(400, "Invalid signature")

    if evt.event_type == "checkout.session.completed" and evt.payment_status == "paid":
        await _credit_transaction(evt.session_id)

    return {"received": True}
