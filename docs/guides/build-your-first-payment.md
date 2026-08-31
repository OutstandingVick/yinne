# Build your first payment with Mock Provider

Start PostgreSQL, migrate, and seed:

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:migrate
pnpm worker:migrate
pnpm db:seed
pnpm dev
```

Sign in at `http://localhost:3000` as `owner@acme.test` using `YINNE_SEED_PASSWORD`. Open **Orders**, select an unpaid/unfulfilled order, and choose **Pay with Mock Provider**. The payment detail displays its succeeded attempt and one immutable charge transaction; the order becomes paid and stock decreases once.

API equivalent using a test API key with `orders:write`, `payments:read`, and `payments:refund` scopes:

```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer $YINNE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: tutorial-payment-0001" \
  -d '{"order_id":"ORDER_UUID","confirmation":{"mock_scenario":"success"}}'
```

Retry the identical request and key to receive the same payment. Change the body with the same key to receive `409 idempotency_key_reused`. Use `pending:then_success`, construct a signed Mock event with `buildMockWebhook`, and post its raw body to `/v1/providers/mock/{organizationId}/{accountId}/webhook` with `Yinne-Mock-Timestamp` and `Yinne-Mock-Signature` headers to exercise asynchronous resolution.

Refund the full remaining amount by omitting `amount`, or supply a positive minor-unit string for a partial refund:

```bash
curl -X POST http://localhost:3000/v1/refunds \
  -H "Authorization: Bearer $YINNE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: tutorial-refund-0001" \
  -d '{"payment_id":"PAYMENT_UUID","amount":"10000","reason":"customer_request","confirmation":{"mock_scenario":"refund_success"}}'
```

Mock never contacts a PSP and cannot run in live mode. Amounts are minor-unit integer strings; no raw card fields exist.
