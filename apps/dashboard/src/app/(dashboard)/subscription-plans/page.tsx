import Link from "next/link";
import { Badge, Button, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listPlans } from "@yinne/subscriptions";
import { activeUserContext } from "../../../lib/context";

export default async function PlansPage() {
  const rows = await listPlans(await activeUserContext(createRequestId()), { limit: 100 });
  return <><PageHeader title="Subscription Plans" description="Stable recurring offerings with immutable monthly or annual Prices." actions={<Link href="/subscription-plans/new"><Button>Create plan</Button></Link>} />
    {!rows.data.length ? <EmptyState title="No subscription plans" description="Create a Plan and an immutable Price to begin." /> : <Table label="Subscription Plans"><thead><tr><th>Name</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.data.map((row) => <tr key={row.id}><td><Link href={`/subscription-plans/${row.id}`}>{row.name}</Link></td><td><Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</Badge></td><td>{new Date(row.created_at).toLocaleDateString()}</td></tr>)}</tbody></Table>}</>;
}
