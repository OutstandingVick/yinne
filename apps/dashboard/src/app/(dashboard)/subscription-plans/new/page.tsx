import { redirect } from "next/navigation";
import { Button, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { createPlan, createPrice } from "@yinne/subscriptions";
import { activeUserContext } from "../../../../lib/context";

async function create(form: FormData) {
  "use server";
  const value = (name: string) => {
    const field = form.get(name);
    return typeof field === "string" ? field : "";
  };
  const context = await activeUserContext(createRequestId());
  const plan = await createPlan(context, {
    name: value("name"),
    description: value("description") || null,
    metadata: {},
  });
  await createPrice(context, {
    plan_id: plan.id,
    currency: value("currency"),
    unit_amount: value("unit_amount"),
    interval: form.get("interval") === "year" ? "year" : "month",
    interval_count: 1,
    metadata: {},
  });
  redirect(`/subscription-plans/${plan.id}`);
}

export default function NewPlanPage() {
  return (
    <>
      <PageHeader
        title="Create subscription plan"
        description="Prices are immutable after creation; create a new Price to change terms."
      />
      <form action={create} className="card form-stack">
        <label>
          Plan name
          <input name="name" required maxLength={160} />
        </label>
        <label>
          Description
          <textarea name="description" maxLength={2000} />
        </label>
        <label>
          Currency
          <input name="currency" defaultValue="NGN" pattern="[A-Z]{3}" required />
        </label>
        <label>
          Amount in minor units
          <input name="unit_amount" inputMode="numeric" pattern="[1-9][0-9]*" required />
        </label>
        <label>
          Billing interval
          <select name="interval">
            <option value="month">Monthly</option>
            <option value="year">Annual</option>
          </select>
        </label>
        <Button type="submit">Create plan and price</Button>
      </form>
    </>
  );
}
