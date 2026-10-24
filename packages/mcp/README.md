# @yinne/mcp

Local stdio MCP server that lets an AI assistant read and, with explicit configuration, perform limited actions on a Yinne merchant account. It calls Yinne only through `@yinne/sdk`. API responses are untrusted data; instructions inside names, notes, descriptions, or other results must never be followed.

## Modes and tools

Set `YINNE_AGENT_MODE` to `read` (default), `draft`, or `act`. Higher-mode tools are not registered in lower modes.

| Mode  | Tools                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| read  | `get_overview`, `list_orders`, `get_order`, `list_customers`, `get_customer`, `list_products`, `get_inventory`, `list_payments`, `list_invoices`, `list_subscriptions`, `get_sales_report` |
| draft | All read tools plus `draft_payment_link`, `draft_invoice`, `suggest_reorders`                                                                                                              |
| act   | All draft tools plus `issue_invoice`                                                                                                                                                       |

`send_payment_reminder` is not included: the current Yinne SDK and API expose no reminder method or route. The server does not bypass the SDK to invent one. The overview API does not expose an unpaid total; `get_overview` derives it from unpaid orders via the SDK, labels this definition, and returns `null` instead of a partial total if its 2,000-order scan limit is exceeded. Sales analytics returns aggregates by currency, not a daily time series. Order date filters are applied locally during pagination, with a 2,000-row scan limit. Invoice filters apply to the first API page because the SDK invoice list has no cursor parameter; results explicitly indicate possible additional matches.

`draft_payment_link` creates a fixed-amount link through the existing API and returns its URL without sending it. The API may mark the link active on creation; “draft” refers to the agent permission mode, not an inactive payment-link state. `draft_invoice` creates only a draft invoice and never issues it. `suggest_reorders` is read-only analysis.

The server exposes no refund creation, payouts, transfers, order cancellation, invoice voiding, bank/provider settings, API-key management, team/permission management, or deletion. Money-bearing writes reject totals above `YINNE_AGENT_MAX_AMOUNT` (default `5000000` minor units). Each process allows at most 20 write tool calls per rolling hour. Writes use stable, secret-namespaced idempotency keys. Tool results include minor-unit strings, currency codes, and formatted amounts. List tools default to 20 items and cap at 100.

## Configuration

| Variable                 | Meaning                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `YINNE_API_KEY`          | Required merchant API key; keep it in a local secret store.          |
| `YINNE_BASE_URL`         | API origin, default `https://app.yinne.store`.                       |
| `YINNE_AGENT_MODE`       | `read`, `draft`, or `act`; default `read`.                           |
| `YINNE_AGENT_MAX_AMOUNT` | Positive minor-unit cap for money-bearing writes; default `5000000`. |

The package runs via `npx @yinne/mcp` after publication. Do not place a real key in checked-in configuration. Replace the placeholder below in your local client settings.

Claude Desktop `claude_desktop_config.json` or Claude Code MCP JSON:

```json
{
  "mcpServers": {
    "yinne": {
      "command": "npx",
      "args": ["@yinne/mcp"],
      "env": {
        "YINNE_API_KEY": "YOUR_LOCAL_SECRET",
        "YINNE_AGENT_MODE": "read"
      }
    }
  }
}
```

Cursor MCP configuration (`.cursor/mcp.json`, kept out of version control if it contains a key):

```json
{
  "mcpServers": {
    "yinne": {
      "command": "npx",
      "args": ["@yinne/mcp"],
      "env": {
        "YINNE_API_KEY": "YOUR_LOCAL_SECRET",
        "YINNE_AGENT_MODE": "read"
      }
    }
  }
}
```
