import Link from "next/link";
import {
  ActionGroup,
  Button,
  CoreScreen,
  DetailGrid,
  DetailItem,
  PageHeader,
  StatusBadge,
} from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getStore } from "@yinne/storefront";
import { activeUserContext } from "../../../lib/context";

export default async function StorefrontPage() {
  const store = await getStore(await activeUserContext(createRequestId()));
  return (
    <CoreScreen className="module-screen">
      <PageHeader
        title="Storefront"
        description="Your public shop is a presentation layer over canonical products, checkout, and payments."
        actions={
          <Link href={`/store/${store.slug}`} target="_blank">
            <Button>View public store</Button>
          </Link>
        }
      />
      <DetailGrid className="module-summary" aria-label="Store status">
        <DetailItem label="Status">
          <StatusBadge tone={store.status === "active" ? "success" : "warning"}>
            {store.status}
          </StatusBadge>
        </DetailItem>
        <DetailItem label="Public URL">
          <Link className="module-public-url" href={store.public_url}>
            {store.public_url}
          </Link>
        </DetailItem>
        <DetailItem label="Currency">{store.currency}</DetailItem>
        <DetailItem label="Catalogue version">{store.catalogue_version}</DetailItem>
      </DetailGrid>
      <ActionGroup className="module-actions">
        <Link href="/storefront/settings">
          <Button className="button-secondary">Store settings</Button>
        </Link>
        <Link href="/storefront/catalogue">
          <Button className="button-secondary">Manage catalogue</Button>
        </Link>
      </ActionGroup>
    </CoreScreen>
  );
}
