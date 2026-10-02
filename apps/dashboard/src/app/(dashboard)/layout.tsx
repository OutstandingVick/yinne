import Image from "next/image";
import { NavLink } from "./nav-link";
import { DashboardShell } from "./shell";
import "./fonts.css";
import "./tokens.css";
import "./dashboard.css";
import "./core-screens.css";
import "./module-screens.css";
import "./operations-intelligence.css";
import "./developer-settings.css";
import "./overview-reconstruction.css";
import { redirect } from "next/navigation";
import { Badge, Button } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrganization } from "@yinne/organizations/services";
import { auth, signOut } from "../../auth";
import { activeUserContext } from "../../lib/context";
import { listUserOrganizations } from "@yinne/organizations/identity";
import { switchOrganizationAction } from "./actions";

const workspaceNav = [
  {
    label: "Workspace",
    items: [
      ["Home", "/"],
      ["Customers", "/commerce/customers"],
      ["Products", "/commerce/products"],
      ["Inventory", "/commerce/inventory"],
      ["Orders", "/commerce/orders"],
    ],
  },
  {
    label: "Payments",
    items: [
      ["Payments", "/payments"],
      ["Checkout Sessions", "/checkout/sessions"],
      ["Payment Links", "/payment-links"],
    ],
  },
  {
    label: "Sales channels",
    items: [
      ["Storefront", "/storefront"],
      ["Marketplace", "/marketplace/manage"],
    ],
  },
  {
    label: "Finance",
    items: [
      ["Transactions", "/transactions"],
      ["Refunds", "/refunds"],
      ["Invoices", "/invoices"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Locations", "/operations/locations"],
      ["Employees", "/operations/employees"],
    ],
  },
  {
    label: "Recurring",
    items: [
      ["Subscription Plans", "/subscription-plans"],
      ["Subscriptions", "/subscriptions"],
    ],
  },
] as const;
const intelligenceNav = [
  ["Analytics", "/analytics"],
  ["Capital", "/capital"],
] as const;
const platformNav = [
  ["Team", "/settings/team", false],
  ["Organization", "/settings/organization", false],
  ["Providers", "/settings/providers", false],
  ["Mock Provider", "/developer/mock-provider", false],
  ["API keys", "/developer/api-keys", false],
  ["Events", "/developer/events", false],
  ["Audit logs", "/developer/audit", false],
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user.id) redirect("/sign-in");
  const context = await activeUserContext(createRequestId());
  const organization = await getOrganization(context);
  const memberships = await listUserOrganizations(session.user.id);
  return (
    <div className="dashboard-theme">
      <div className="test-banner">TEST MODE · No real financial execution is available</div>
      <DashboardShell
        sidebar={
          <>
            <div className="brand">
              <Image src="/brand/yinne-logo.svg" alt="Yinne" width={130} height={27} priority />
            </div>
            <div className="org-chip">
              <strong>{organization.name}</strong>
              <br />
              <span>
                {organization.defaultCurrency} · {organization.timezone}
              </span>
            </div>
            <nav aria-label="Primary">
              {workspaceNav.map((group) => (
                <div className="nav-group" role="group" aria-label={group.label} key={group.label}>
                  <div className="nav-label">{group.label}</div>
                  {group.items.map(([label, href]) => (
                    <NavLink href={href} key={label}>
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
              <div className="nav-group" role="group" aria-label="Intelligence">
                <div className="nav-label">Intelligence</div>
                {intelligenceNav.map(([label, href]) => (
                  <NavLink href={href} key={label}>
                    {label}
                  </NavLink>
                ))}
              </div>
              <div className="nav-group" role="group" aria-label="Platform">
                <div className="nav-label">Platform</div>
                {platformNav.map(([label, href]) => (
                  <NavLink href={href} key={label}>
                    {label}
                  </NavLink>
                ))}
              </div>
            </nav>
          </>
        }
        topbar={
          <>
            <Badge tone="warning">Test</Badge>
            <form action={switchOrganizationAction} className="organization-switcher">
              <label htmlFor="active-organization">Organization</label>
              <select
                id="active-organization"
                name="organization_id"
                defaultValue={context.tenant.organizationId}
              >
                {memberships.map((membership) => (
                  <option value={membership.organization_id} key={membership.organization_id}>
                    {membership.organization_name}
                  </option>
                ))}
              </select>
              <Button className="button-secondary" type="submit">
                Switch
              </Button>
            </form>
            <span className="account-email">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <Button className="button-secondary" type="submit">
                Sign out
              </Button>
            </form>
          </>
        }
      >
        {children}
      </DashboardShell>
    </div>
  );
}
