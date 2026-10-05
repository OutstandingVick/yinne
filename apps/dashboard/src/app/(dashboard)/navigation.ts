export type NavGroup = {
  label: string;
  icon:
    | "home"
    | "commerce"
    | "payments"
    | "channels"
    | "finance"
    | "operations"
    | "recurring"
    | "intelligence"
    | "platform";
  items: readonly (readonly [label: string, href: string])[];
};

export const navigation: readonly NavGroup[] = [
  { label: "Home", icon: "home", items: [["Home", "/"]] },
  {
    label: "Commerce",
    icon: "commerce",
    items: [
      ["Customers", "/commerce/customers"],
      ["Products", "/commerce/products"],
      ["Inventory", "/commerce/inventory"],
      ["Orders", "/commerce/orders"],
    ],
  },
  {
    label: "Payments",
    icon: "payments",
    items: [
      ["Payments", "/payments"],
      ["Checkout Sessions", "/checkout/sessions"],
      ["Payment Links", "/payment-links"],
    ],
  },
  {
    label: "Sales channels",
    icon: "channels",
    items: [
      ["Storefront", "/storefront"],
      ["Marketplace", "/marketplace/manage"],
    ],
  },
  {
    label: "Finance",
    icon: "finance",
    items: [
      ["Transactions", "/transactions"],
      ["Refunds", "/refunds"],
      ["Invoices", "/invoices"],
    ],
  },
  {
    label: "Operations",
    icon: "operations",
    items: [
      ["Locations", "/operations/locations"],
      ["Employees", "/operations/employees"],
    ],
  },
  {
    label: "Recurring",
    icon: "recurring",
    items: [
      ["Subscription Plans", "/subscription-plans"],
      ["Subscriptions", "/subscriptions"],
    ],
  },
  {
    label: "Intelligence",
    icon: "intelligence",
    items: [
      ["Analytics", "/analytics"],
      ["Capital", "/capital"],
    ],
  },
  {
    label: "Platform",
    icon: "platform",
    items: [
      ["Team", "/settings/team"],
      ["Organization", "/settings/organization"],
      ["Providers", "/settings/providers"],
      ["Mock Provider", "/developer/mock-provider"],
      ["API keys", "/developer/api-keys"],
      ["Events", "/developer/events"],
      ["Audit logs", "/developer/audit"],
    ],
  },
];

export function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
