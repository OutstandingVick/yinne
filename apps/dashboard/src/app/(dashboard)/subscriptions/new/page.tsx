import { redirect } from "next/navigation";
import { Button, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listCustomers } from "@yinne/commerce";
import { listLocations } from "@yinne/operations";
import { createSubscription, listPrices, processSubscriptionRenewal } from "@yinne/subscriptions";
import { activeUserContext } from "../../../../lib/context";
async function create(form: FormData) {
  "use server";
  const value = (name: string) => {
    const field = form.get(name);
    return typeof field === "string" ? field : "";
  };
  const context = await activeUserContext(createRequestId());
  const subscription = await createSubscription(
    context,
    {
      customer_id: value("customer_id"),
      price_id: value("price_id"),
      merchant_id: value("merchant_id"),
      location_id: value("location_id"),
      billing_timezone: value("billing_timezone"),
      trial_days: Number(value("trial_days")),
      mock_renewal_outcome: "succeed",
      metadata: {},
    },
    crypto.randomUUID(),
  );
  if (typeof subscription !== "object" || !subscription || !("id" in subscription))
    throw new Error("Subscription response missing.");
  const id = String(subscription.id);
  if (Number(value("trial_days")) === 0) await processSubscriptionRenewal(context, id);
  redirect(`/subscriptions/${id}`);
}
export default async function NewSubscriptionPage() {
  const context = await activeUserContext(createRequestId());
  const [customers, locations, prices] = await Promise.all([
    listCustomers(context, { limit: 100 }),
    listLocations(context, { limit: 100, status: "active" }),
    listPrices(context, { limit: 100, status: "active" }),
  ]);
  return (
    <>
      <PageHeader
        title="Create subscription"
        description="Test mode simulates unattended renewal; no card or production mandate is stored."
      />
      <form action={create} className="card form-stack">
        <label>
          Customer
          <select name="customer_id" required>
            {customers.data.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Price
          <select name="price_id" required>
            {prices.data.map((price) => (
              <option key={price.id} value={price.id}>
                {price.currency} {price.unit_amount} / {price.interval}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select name="location_id" required>
            {locations.data.map((location) => (
              <option key={location.id} value={location.id} data-merchant={location.merchant_id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="merchant_id" value={locations.data[0]?.merchant_id} />
        <label>
          Billing timezone
          <input name="billing_timezone" defaultValue="Africa/Lagos" required />
        </label>
        <label>
          Trial days
          <input name="trial_days" type="number" min="0" max="90" defaultValue="0" />
        </label>
        <Button type="submit">Create subscription</Button>
      </form>
    </>
  );
}
