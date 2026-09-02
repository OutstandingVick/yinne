import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrganization } from "@yinne/organizations/services";
import { auth, signOut } from "../../auth";
import { activeUserContext } from "../../lib/context";
import { listUserOrganizations } from "@yinne/organizations/identity";
import { switchOrganizationAction } from "./actions";

const nav = [
  ["Home", "/", false],
  ["Customers", "/commerce/customers", false],
  ["Products", "/commerce/products", false],
  ["Inventory", "/commerce/inventory", false],
  ["Orders", "/commerce/orders", false],
  ["Payments", "/payments", false],
  ["Checkout Sessions", "/checkout/sessions", false],
  ["Payment Links", "/payment-links", false],
  ["Storefront", "/storefront", false],
  ["Transactions", "/transactions", false],
  ["Refunds", "/refunds", false],
  ["Intelligence", "/coming-later?area=Intelligence", true],
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
    <>
      <div className="test-banner">TEST MODE · No real financial execution is available</div>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">Y</span> Yinne
          </div>
          <div className="org-chip">
            <strong>{organization.name}</strong>
            <br />
            <span>
              {organization.defaultCurrency} · {organization.timezone}
            </span>
          </div>
          <nav aria-label="Primary">
            <div className="nav-label">Workspace</div>
            {nav.slice(0, 12).map(([label, href, planned]) => (
              <Link
                className={"nav-link " + (planned ? "nav-planned" : "")}
                href={href}
                key={label}
              >
                <span>{label}</span>
                {planned ? <span className="nav-tag">Later</span> : null}
              </Link>
            ))}
            <div className="nav-label">Platform</div>
            {nav.slice(12).map(([label, href]) => (
              <Link className="nav-link" href={href} key={label}>
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="main">
          <header className="topbar">
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
            <span>{session.user.email}</span>
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
          </header>
          <main className="content">{children}</main>
        </div>
      </div>
    </>
  );
}
