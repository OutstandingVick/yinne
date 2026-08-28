# Public API specification

Base /v1; HTTPS only outside local development. Bearer API keys use Authorization. Dashboard sessions reach the same policies. Organization and test/live environment come from the credential and cannot be overridden.

## Conventions

- JSON snake_case; RFC 3339 UTC; money amounts are integer strings with currency.
- Cursor pagination uses limit and after, max 100; response has data, has_more, next_cursor.
- Filters/sorts/one-level expansions are allowlisted and cost-bounded.
- Create returns 201, async work 202, archive 204. Responses include request_id.
- Idempotency-Key is 16–255 printable ASCII and required for checkout confirm, payment create/confirm, and refund. Scope: organization, principal, environment, route template. Default TTL seven days, never under 24 hours. Same key/body returns stored status/body; changed body returns 409 idempotency_conflict; in-flight returns 409 plus Retry-After.
- URL major version plus additive evolution. Breaking semantics require /v2; deprecation includes Sunset headers and at least six months.
- Defaults: 120 reads/min and 60 writes/min per org/key, with tighter auth/replay limits. 429 includes Retry-After and limit headers.

```json
{
  "error": {
    "type": "invalid_request",
    "code": "customer_not_found",
    "message": "The specified customer does not exist.",
    "param": "customer_id",
    "request_id": "req_01",
    "doc_url": "https://docs.yinne.dev/errors/customer_not_found",
    "details": []
  }
}
```

Error types: authentication_error, authorization_error, invalid_request, conflict, rate_limit, provider_error, internal_error. Provider errors expose normalized code/retryability only.

## V1 endpoints

| Resource                        | Endpoints                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| organization                    | GET/PATCH /organization                                          |
| members/roles                   | GET/POST /members; GET/PATCH /members/{id}; GET /roles           |
| merchants, locations, customers | list/create/get/patch                                            |
| products                        | list/create/get/patch; POST /products/{id}/archive               |
| inventory                       | GET /inventory-levels; POST /inventory-adjustments               |
| orders                          | list/create/get; POST /orders/{id}/cancel and /fulfil            |
| checkout sessions               | list/create/get; POST /checkout/sessions/{id}/confirm or /cancel |
| payments                        | list/get/create; POST /payments/{id}/confirm                     |
| refunds                         | list/get/create                                                  |
| transactions                    | list/get, read-only                                              |
| payment links                   | list/create/get/patch; activate/deactivate commands              |
| provider accounts               | list/create/get/patch; verify/disable commands                   |
| webhooks/events                 | endpoint CRUD; delivery list/replay; event list/get              |
| API keys                        | list/create/revoke; secret shown once                            |
| analytics                       | GET /analytics/summary                                           |
| audit                           | list/get for authorized roles                                    |

No generic status mutation or bulk financial writes.

## Request/response examples for every V1 resource

Organization:

```http
PATCH /v1/organization
{"name":"Acme Coffee","default_currency":"NGN","timezone":"Africa/Lagos"}
```

```json
{
  "id": "org_01",
  "name": "Acme Coffee",
  "default_currency": "NGN",
  "timezone": "Africa/Lagos",
  "request_id": "req_01"
}
```

Member and roles:

```http
POST /v1/members
{"email":"manager@acme.test","role":"manager","scope":{"type":"location","id":"loc_ikeja"}}
GET /v1/roles
```

```json
{
  "id": "mem_01",
  "status": "invited",
  "roles": [{ "role": "manager", "scope": { "type": "location", "id": "loc_ikeja" } }]
}
```

Merchant and location:

```http
POST /v1/merchants
{"display_name":"Acme Coffee","slug":"acme"}
POST /v1/locations
{"merchant_id":"mer_01","name":"Ikeja","type":"store","timezone":"Africa/Lagos"}
```

```json
{ "id": "loc_ikeja", "merchant_id": "mer_01", "name": "Ikeja", "type": "store", "status": "active" }
```

Customer:

```http
POST /v1/customers
{"name":"Jane Doe","email":"jane@example.com","external_ref":"crm_42"}
```

```json
{
  "id": "cus_01",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "created_at": "2026-08-27T10:00:00Z"
}
```

Product and inventory:

```http
POST /v1/products
{"name":"House Blend","slug":"house-blend","variants":[{"title":"250g","sku":"HB-250","unit_amount":"850000","currency":"NGN"}]}
POST /v1/inventory-adjustments
{"variant_id":"var_01","location_id":"loc_ikeja","delta":"20","reason":"initial_stock"}
```

```json
{
  "product": {
    "id": "prod_01",
    "status": "draft",
    "variants": [{ "id": "var_01", "sku": "HB-250", "unit_amount": "850000", "currency": "NGN" }]
  },
  "inventory_level": { "on_hand": "20" }
}
```

Order:

```http
POST /v1/orders
{"merchant_id":"mer_01","location_id":"loc_ikeja","customer_id":"cus_01","items":[{"variant_id":"var_01","quantity":2}]}
```

```json
{
  "id": "ord_01",
  "financial_status": "unpaid",
  "currency": "NGN",
  "total_amount": "1700000",
  "items": [{ "quantity": 2, "unit_amount": "850000" }]
}
```

Checkout:

```http
POST /v1/checkout/sessions
{"merchant_id":"mer_01","customer_id":"cus_01","items":[{"variant_id":"var_01","quantity":2}],"success_url":"https://shop.test/success","cancel_url":"https://shop.test/cart"}
```

```json
{
  "id": "cs_01",
  "status": "open",
  "amount_total": "1700000",
  "currency": "NGN",
  "expires_at": "2026-08-27T10:30:00Z",
  "url": "https://checkout.test/c/cs_01"
}
```

Payment, refund, transaction:

```http
POST /v1/payments
Idempotency-Key: 3cab...
{"order_id":"ord_01","provider_account_id":"pa_mock","confirmation":{"mock_scenario":"success"}}

POST /v1/refunds
Idempotency-Key: d9a1...
{"payment_id":"pay_01","amount":"850000","reason":"customer_request"}

GET /v1/transactions?payment_id=pay_01
```

```json
{
  "payment": {
    "id": "pay_01",
    "status": "pending",
    "amount": "1700000",
    "currency": "NGN",
    "latest_attempt": { "id": "pat_01", "status": "submitted" }
  },
  "refund": { "id": "ref_01", "status": "pending", "amount": "850000" },
  "transactions": [{ "id": "txn_01", "kind": "charge", "amount": "1700000" }]
}
```

Payment link:

```http
POST /v1/payment-links
{"merchant_id":"mer_01","kind":"product","items":[{"variant_id":"var_01","quantity":1}],"usage_limit":100}
```

```json
{
  "id": "plink_01",
  "status": "active",
  "url": "https://shop.test/pay/coffee",
  "usage_count": 0,
  "usage_limit": 100
}
```

Provider account:

```http
POST /v1/provider-accounts
{"provider":"mock","environment":"test","label":"Local mock","configuration":{"default_scenario":"success"}}
```

```json
{
  "id": "pa_mock",
  "provider": "mock",
  "environment": "test",
  "status": "active",
  "capabilities": ["payment.create", "payment.refund", "webhook.verify"]
}
```

Webhook and event:

```http
POST /v1/webhook-endpoints
{"url":"https://example.test/yinne","events":["payment.*","order.paid"]}
GET /v1/events?type=payment.succeeded
```

```json
{
  "endpoint": { "id": "we_01", "status": "active", "secret": "whsec_returned_once" },
  "event": {
    "id": "evt_01",
    "type": "payment.succeeded",
    "api_version": "2026-08-27",
    "data": { "object": { "id": "pay_01" } }
  }
}
```

API key:

```http
POST /v1/api-keys
{"name":"Backend","environment":"test","scopes":["customers:write","checkout:write"]}
```

```json
{
  "id": "key_01",
  "secret": "yk_test_returned_once",
  "prefix": "yk_test_ab12",
  "scopes": ["customers:write", "checkout:write"]
}
```

Analytics and audit:

```http
GET /v1/analytics/summary?from=2026-08-01T00:00:00Z&to=2026-09-01T00:00:00Z&currency=NGN
GET /v1/audit-logs?action=refund.create
```

```json
{
  "summary": {
    "currency": "NGN",
    "timezone": "Africa/Lagos",
    "gmv": { "amount": "420000000" },
    "successful_payments": 312,
    "aov": { "amount": "1346154" },
    "fresh_through": "2026-08-27T10:05:00Z"
  },
  "audit": {
    "id": "aud_01",
    "action": "refund.create",
    "target": { "type": "refund", "id": "ref_01" }
  }
}
```

## API key scopes

Scopes map to RBAC permission verbs (customers:read/write, products:read/write, orders:read/write, checkout:read/write, payments:read/refund, transactions:read, providers:read/write, analytics:read, webhooks:read/write/replay, events:read). Key creation cannot grant beyond actor permissions.
