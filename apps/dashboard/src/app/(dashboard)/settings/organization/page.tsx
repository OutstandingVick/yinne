import { Button, Input, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrganization } from "@yinne/organizations/services";
import { activeUserContext } from "../../../../lib/context";
import { updateOrganizationAction } from "../../actions";

export default async function OrganizationPage() {
  const context = await activeUserContext(createRequestId());
  const organization = await getOrganization(context);
  return (
    <>
      <PageHeader
        title="Organization"
        description="The organization is the security and data tenant. Merchant brands remain separate operational profiles."
      />
      <section className="card">
        <form className="form" action={updateOrganizationAction}>
          <div className="form-row">
            <label htmlFor="name">Organization name</label>
            <Input id="name" name="name" required minLength={2} defaultValue={organization.name} />
          </div>
          <div className="form-row">
            <label htmlFor="currency">Default currency</label>
            <Input
              id="currency"
              name="default_currency"
              required
              pattern="[A-Z]{3}"
              defaultValue={organization.defaultCurrency}
            />
          </div>
          <div className="form-row">
            <label htmlFor="timezone">Reporting timezone</label>
            <Input id="timezone" name="timezone" required defaultValue={organization.timezone} />
          </div>
          <Button type="submit">Save organization</Button>
        </form>
      </section>
    </>
  );
}
