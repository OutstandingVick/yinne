import { notFound } from "next/navigation";
import {
  ActionGroup,
  Button,
  CoreScreen,
  FinancialAmount,
  PageHeader,
  StatusBadge,
  Table,
} from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getProduct } from "@yinne/commerce";
import { activeUserContext } from "../../../../../lib/context";
import { formatMinorAmount } from "../../../../../lib/money";
import { activateProductAction, archiveProductAction } from "../../../actions";
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const product = await getProduct(await activeUserContext(createRequestId()), (await params).id);
    const actions =
      product.status !== "archived" ? (
        <ActionGroup>
          {product.status === "draft" ? (
            <form action={activateProductAction}>
              <input type="hidden" name="product_id" value={product.id} />
              <Button type="submit">Activate</Button>
            </form>
          ) : null}
          <form action={archiveProductAction}>
            <input type="hidden" name="product_id" value={product.id} />
            <Button type="submit" className="button-danger">
              Archive
            </Button>
          </form>
        </ActionGroup>
      ) : undefined;
    return (
      <CoreScreen>
        <PageHeader
          title={product.name}
          description={product.description ?? product.slug}
          actions={actions}
        />
        <p className="core-status-line">
          <StatusBadge
            tone={
              product.status === "active"
                ? "success"
                : product.status === "archived"
                  ? "danger"
                  : "warning"
            }
          >
            {product.status}
          </StatusBadge>
        </p>
        <Table label="Product variants" density="compact">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Variant</th>
              <th>Price</th>
              <th>Inventory</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td className="mono">{variant.sku}</td>
                <td>{variant.title}</td>
                <td>
                  <FinancialAmount>
                    {formatMinorAmount(variant.unit_amount, variant.currency)}
                  </FinancialAmount>
                </td>
                <td>{variant.track_inventory ? "Tracked" : "Not tracked"}</td>
                <td>
                  <StatusBadge tone={variant.status === "active" ? "success" : "danger"}>
                    {variant.status}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CoreScreen>
    );
  } catch {
    notFound();
  }
}
