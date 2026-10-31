export const products = [
  {
    id: "commerce",
    label: "Commerce",
    title: "Keep selling in one place.",
    description:
      "Bring your storefront, catalogue, orders and stock together, so every sale starts with the same picture of your business.",
    features: ["Storefront and catalogue", "Orders and customers", "Inventory by location"],
    previewTitle: "Commerce workspace",
    previewRows: ["Storefront", "Orders", "Inventory"],
    flow: ["Add products", "Take an order", "Track stock"],
  },
  {
    id: "payments",
    label: "Payments",
    title: "Give every sale a way to pay.",
    description:
      "Create payment links, offer hosted checkout and follow the payment record alongside the order it belongs to.",
    features: ["Payment links", "Hosted checkout", "Transactions and refunds"],
    previewTitle: "Payments workspace",
    previewRows: ["Payment links", "Checkout sessions", "Transactions"],
    flow: ["Create a link", "Share it", "Track payment"],
  },
  {
    id: "billing",
    label: "Billing",
    title: "Make repeat business easier.",
    description:
      "Manage invoices, plans and subscriptions in the same workspace as the customers and payments behind them.",
    features: ["Invoices", "Subscription plans", "Recurring billing"],
    previewTitle: "Billing workspace",
    previewRows: ["Invoices", "Plans", "Subscriptions"],
    flow: ["Set up a plan", "Bill a customer", "Follow the cycle"],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    title: "Understand what is moving.",
    description:
      "Use connected commerce and payment data to review performance and explore your capital profile with more context.",
    features: ["Sales analytics", "Customer and product reports", "Capital intelligence"],
    previewTitle: "Intelligence workspace",
    previewRows: ["Analytics", "Reports", "Capital intelligence"],
    flow: ["Choose a view", "Review the signals", "Plan the next step"],
  },
  {
    id: "developers",
    label: "Developers",
    title: "Build on the same foundation.",
    description:
      "Connect your own workflows through Yinne's API, TypeScript SDK and webhook events.",
    features: ["REST API", "TypeScript SDK", "Webhook events"],
    previewTitle: "Developer workspace",
    previewRows: ["API keys", "Webhooks", "Events"],
    flow: ["Create a test key", "Make an API call", "Listen for events"],
  },
];
