# Capital Intelligence API

Capital endpoints require organization-wide Capital permissions and use the active test/live environment.

```text
GET  /v1/capital/profile
GET  /v1/capital/profile/history?limit=20
GET  /v1/capital/signals
POST /v1/capital/recalculate
```

The profile and signal endpoints expose aggregate evidence only. Recalculation accepts optional `as_of` and `currency`, returns `202`, is rate limited, and enqueues Graphile Worker rather than calculating synchronously.

```ts
const profile = await yinne.capital.profile();
const history = await yinne.capital.history({ limit: 12 });
const evidence = await yinne.capital.signals();
await yinne.capital.recalculate({ currency: "NGN" });
```

`score: null`, `band: null`, and `status: "insufficient_data"` mean the minimum evidence is not available; they do not mean a score of zero. Monetary raw values are integer minor-unit strings and one profile covers one ISO currency. `model_version` preserves historical interpretation.

Recalculation requires `capital:recalculate`; reading requires `capital:read`. Location-only assignments cannot access organization-wide Capital data. Never expose these responses as loan eligibility or approval.
