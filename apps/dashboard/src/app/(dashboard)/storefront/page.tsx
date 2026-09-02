import Link from "next/link";
import { Badge, Button, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getStore } from "@yinne/storefront";
import { activeUserContext } from "../../../lib/context";

export default async function StorefrontPage() {
  const store = await getStore(await activeUserContext(createRequestId()));
  return (
    <>
      <PageHeader
        title="Storefront"
        description="Your public shop is a presentation layer over canonical products, checkout, and payments."
        actions={
          <Link href={`/store/${store.slug}`} target="_blank">
            <Button>View public store</Button>
          </Link>
        }
      />
      <section className="card detail-grid" aria-labelledby="store-status">
        <div>
          <span className="label">Status</span>
          <h2 id="store-status">
            <Badge tone={store.status === "active" ? "success" : "warning"}>{store.status}</Badge>
          </h2>
        </div>
        <div>
          <span className="label">Public URL</span>
          <p>
            <Link href={store.public_url}>{store.public_url}</Link>
          </p>
        </div>
        <div>
          <span className="label">Currency</span>
          <p>{store.currency}</p>
        </div>
        <div>
          <span className="label">Catalogue version</span>
          <p>{store.catalogue_version}</p>
        </div>
      </section>
      <div className="action-row">
        <Link href="/storefront/settings">
          <Button className="button-secondary">Store settings</Button>
        </Link>
        <Link href="/storefront/catalogue">
          <Button className="button-secondary">Manage catalogue</Button>
        </Link>
      </div>
    </>
  );
}
