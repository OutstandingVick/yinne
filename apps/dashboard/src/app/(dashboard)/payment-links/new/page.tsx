import { PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrderCreationOptions } from "@yinne/commerce";
import { activeUserContext } from "../../../../lib/context";
import { NewLinkForm } from "./new-link-form";
export default async function NewPaymentLinkPage() {
  const options = await getOrderCreationOptions(await activeUserContext(createRequestId()));
  return (
    <>
      <PageHeader
        title="Create Payment Link"
        description="Amounts are integer minor units and are validated server-side."
      />
      <NewLinkForm options={options} />
    </>
  );
}
