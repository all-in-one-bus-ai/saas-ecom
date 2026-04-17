"""
Minimal FastAPI health stub.
The primary app is a Next.js application served from /app/frontend on port 3000.
Supabase is used for auth + DB, so there are no custom /api routes needed.
This stub exists to satisfy supervisor's expected 'backend' program.
"""
from fastapi import FastAPI

app = FastAPI(title="ShopStack Backend Health Stub")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "shopstack-stub"}


@app.get("/api/")
async def root():
    return {"message": "Next.js app handles all routes. This stub only serves /api/health."}
