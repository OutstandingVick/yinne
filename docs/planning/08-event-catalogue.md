# Event architecture and V1 catalogue

ProviderEvent is untrusted external evidence. DomainEvent is an immutable aggregate fact committed with state. Public webhook event is a stable privacy-reviewed projection. AuditLog records actor/action/outcome, including denied operations. They are separate stores and lifecycles.

```json
{
  "id": "evt_01",
  "type": "payment.succeeded",
  "version": 1,
  "api_version": "2026-08-27",
  "organization_id": "org_01",
  "environment": "test",
  "occurred_at": "2026-08-27T10:01:00Z",
  "aggregate": { "type": "payment", "id": "pay_01", "version": 3 },
  "actor": { "type": "system" },
  "request_id": "req_01",
  "data": { "payment_id": "pay_01", "order_id": "ord_01", "amount": "1700000", "currency": "NGN" }
}
```

Internal payloads carry IDs; public projections include thin resource snapshots and no secrets/sensitive PII. Events replay within retention by re-running idempotent consumers; public replay creates a delivery generation. Producers enforce unique aggregate version; consumers dedupe event ID.

| Event                                      | Trigger / producer               | Key data                           | Consumers                    | Public            |
| ------------------------------------------ | -------------------------------- | ---------------------------------- | ---------------------------- | ----------------- |
| organization.created/updated               | committed config / Organizations | organization, changed_fields       | defaults, audit              | yes               |
| member.invited/role_updated                | membership command / Identity    | member, role, scope                | mail/session invalidation    | yes               |
| customer.created/updated                   | customer commit / Commerce       | customer, changed_fields           | analytics                    | yes               |
| product.created/updated/published          | catalogue commit / Catalogue     | product, merchant, changed_fields  | search/storefront            | yes               |
| inventory.adjusted                         | movement commit / Inventory      | variant, location, delta, movement | analytics/low-stock          | yes               |
| order.created                              | order commit / Orders            | order, customer, total/currency    | analytics                    | yes               |
| order.cancelled                            | legal cancel / Orders            | order, reason                      | stock/analytics              | yes               |
| order.paid                                 | payment applied / Orders         | order, payment, amount             | stock, fulfilment, analytics | yes               |
| order.fulfilled                            | fulfil command / Orders          | order, location                    | notifications/analytics      | yes               |
| order.partially_refunded/refunded          | refund applied / Orders          | order, refund, total_refunded      | analytics                    | yes               |
| checkout.created                           | session commit / Checkout        | session, total, expiry             | expiry scheduler/analytics   | yes               |
| checkout.processing                        | confirm accepted / Checkout      | session, order, payment            | analytics                    | yes               |
| checkout.completed                         | payment applied / Checkout       | session, order, payment            | redirect/analytics           | yes               |
| checkout.expired/cancelled                 | worker/client / Checkout         | session, reason                    | stock future/analytics       | yes               |
| payment.created                            | payment commit / Payments        | payment, amount/currency           | provider worker              | yes               |
| payment.pending                            | submitted/unknown / Payments     | payment, attempt                   | reconciliation               | yes               |
| payment.succeeded                          | definitive evidence / Payments   | payment, attempt, transaction      | orders/checkout/analytics    | yes               |
| payment.failed                             | definitive failure / Payments    | payment, attempt, error_code       | checkout/analytics           | yes               |
| refund.created/pending                     | refund lifecycle / Payments      | refund, payment, amount            | provider/reconcile           | yes               |
| refund.succeeded                           | definitive evidence / Payments   | refund, payment, transaction       | payment/order/analytics      | yes               |
| refund.failed                              | definitive failure / Payments    | refund, error_code                 | operator alert               | yes               |
| payment_link.created/activated/deactivated | link lifecycle / Links           | link, kind/reason                  | cache/analytics              | yes               |
| provider_account.updated                   | config/capability / Providers    | account, status, capabilities      | router cache/audit           | no                |
| webhook_endpoint.disabled                  | threshold/manual / Webhooks      | endpoint, reason                   | notify/audit                 | yes except source |
| api_key.created/revoked                    | key lifecycle / Developer        | key ID, prefix, scopes             | auth cache/audit             | no                |

All are replayable under the common rule. No V1 invoice, payout, subscription, marketplace, or capital events exist merely as reserved names. Event types are past-tense; breaking payload changes increment version.
