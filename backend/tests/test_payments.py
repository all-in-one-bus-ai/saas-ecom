"""
Backend API tests for ShopStack Payments endpoints.
Tests: subscription checkout, shop checkout, status, webhook, health
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ac90c172-1bcc-4535-aef0-3b08b24885ea.preview.emergentagent.com').rstrip('/')


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_200(self):
        """GET /api/health should return 200 with status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "shopstack-payments"
        print("✓ Health endpoint returns 200 with correct payload")


class TestPaymentStatusEndpoint:
    """Payment status endpoint tests"""
    
    def test_status_non_existent_returns_404(self):
        """GET /api/payments/status/non_existent_id should return 404"""
        response = requests.get(f"{BASE_URL}/api/payments/status/non_existent_id")
        assert response.status_code == 404
        data = response.json()
        assert "Unknown session" in data.get("detail", "")
        print("✓ Status endpoint returns 404 for non-existent session")


class TestSubscriptionCheckout:
    """Subscription checkout endpoint tests"""
    
    def test_subscription_checkout_invalid_plan(self):
        """POST /api/payments/subscription/checkout with invalid plan should return 422 (Pydantic validation)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/subscription/checkout",
            json={
                "tenant_id": "test-tenant-id",
                "plan": "invalid_plan",
                "origin_url": "https://example.com"
            }
        )
        # Pydantic validates the Literal type and returns 422 for invalid values
        assert response.status_code == 422
        print("✓ Subscription checkout rejects invalid plan with 422")
    
    def test_subscription_checkout_missing_tenant(self):
        """POST /api/payments/subscription/checkout with non-existent tenant (valid UUID) should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/payments/subscription/checkout",
            json={
                # Use a valid UUID format that doesn't exist
                "tenant_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "plan": "starter",
                "origin_url": "https://example.com"
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert "Tenant not found" in data.get("detail", "")
        print("✓ Subscription checkout returns 404 for non-existent tenant")


class TestShopCheckout:
    """Shop checkout endpoint tests"""
    
    def test_shop_checkout_empty_cart(self):
        """POST /api/payments/shop/checkout with empty cart should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/payments/shop/checkout",
            json={
                "tenant_slug": "techstore",
                "items": [],
                "customer_email": "test@example.com",
                "origin_url": "https://example.com"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "empty" in data.get("detail", "").lower()
        print("✓ Shop checkout rejects empty cart")
    
    def test_shop_checkout_invalid_tenant(self):
        """POST /api/payments/shop/checkout with non-existent tenant should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/payments/shop/checkout",
            json={
                "tenant_slug": "non-existent-store-12345",
                "items": [{"product_id": "test-product", "quantity": 1}],
                "customer_email": "test@example.com",
                "origin_url": "https://example.com"
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert "Tenant not found" in data.get("detail", "")
        print("✓ Shop checkout returns 404 for non-existent tenant")


class TestWebhook:
    """Stripe webhook endpoint tests"""
    
    def test_webhook_invalid_signature(self):
        """POST /api/webhook/stripe without valid signature should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b'{"type": "checkout.session.completed"}',
            headers={"Content-Type": "application/json", "Stripe-Signature": "invalid"}
        )
        # Expected to return 400 due to invalid signature
        assert response.status_code == 400
        print("✓ Webhook rejects invalid signature")


class TestRootEndpoint:
    """Root API endpoint tests"""
    
    def test_root_returns_endpoints_list(self):
        """GET /api/ should return list of available endpoints"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data
        assert "/api/payments/subscription/checkout" in data["endpoints"]
        assert "/api/payments/shop/checkout" in data["endpoints"]
        assert "/api/payments/status/{session_id}" in data["endpoints"]
        print("✓ Root endpoint returns list of available endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
