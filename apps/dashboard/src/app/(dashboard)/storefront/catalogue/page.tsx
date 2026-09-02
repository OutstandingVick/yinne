import { revalidatePath } from "next/cache";
import { Badge, Button, EmptyState, PageHeader, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listStoreListings, publishStoreProduct, unpublishStoreProduct } from "@yinne/storefront";
import { activeUserContext } from "../../../../lib/context";

async function changePublication(formData: FormData) {
  "use server";
  const context = await activeUserContext(createRequestId());
  const productIdValue = formData.get("product_id");
  if (typeof productIdValue !== "string") throw new Error("A product is required.");
  const productId = productIdValue;
  if (formData.get("action") === "publish") {
    await publishStoreProduct(context, productId, { featured: false, display_order: 0 });
  } else {
    await unpublishStoreProduct(context, productId);
  }
  revalidatePath("/storefront/catalogue");
  revalidatePath("/storefront");
}

export default async function StoreCataloguePage() {
  const rows = await listStoreListings(await activeUserContext(createRequestId()));
  return (
    <>
      <PageHeader
        title="Store catalogue"
        description="Choose which canonical active products customers can discover."
      />
      {!rows.length ? (
        <EmptyState
          title="No products"
          description="Create products in Commerce before publishing a Store."
        />
      ) : (
        <Table label="Store catalogue">
          <thead>
            <tr>
              <th>Product</th>
              <th>Commerce state</th>
              <th>Store state</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id}>
                <td>{row.name}</td>
                <td>{row.product_status}</td>
                <td>
                  <Badge tone={row.publication_status === "published" ? "success" : "warning"}>
                    {row.publication_status}
                  </Badge>
                </td>
                <td>
                  <form action={changePublication}>
                    <input type="hidden" name="product_id" value={row.product_id} />
                    <input
                      type="hidden"
                      name="action"
                      value={row.publication_status === "published" ? "unpublish" : "publish"}
                    />
                    <Button
                      className="button-secondary"
                      disabled={row.product_status !== "active"}
                      type="submit"
                    >
                      {row.publication_status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
