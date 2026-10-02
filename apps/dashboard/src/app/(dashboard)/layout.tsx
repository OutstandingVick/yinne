import Image from "next/image";
import { NavLink } from "./nav-link";
import { navigation } from "./navigation";
import { Rail } from "./rail";
import { DashboardShell } from "./shell";
import "./fonts.css";
import "./tokens.css";
import "./dashboard.css";
import "./core-screens.css";
import "./module-screens.css";
import "./operations-intelligence.css";
import "./developer-settings.css";
import "./overview-reconstruction.css";
import "./rail.css";
import { redirect } from "next/navigation";
import { Badge, Button } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrganization } from "@yinne/organizations/services";
import { auth, signOut } from "../../auth";
import { activeUserContext } from "../../lib/context";
import { listUserOrganizations } from "@yinne/organizations/identity";
import { switchOrganizationAction } from "./actions";

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
        rail={<Rail />}
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
              {navigation.map((group) => (
                <div className="nav-group" role="group" aria-label={group.label} key={group.label}>
                  {group.items.length > 1 && <div className="nav-label">{group.label}</div>}
                  {group.items.map(([label, href]) => (
                    <NavLink href={href} key={href}>
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
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
            <div className="account-controls">
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
            </div>
          </>
        }
      >
        {children}
      </DashboardShell>
    </div>
  );
}
