import Link from "next/link";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { listProducts } from "@yinne/commerce";
import { activeUserContext } from "../../../../lib/context";
import { formatMinorAmount } from "../../../../lib/money";
import { createProductAction } from "../../actions";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const query = await searchParams;
  const products = await listProducts(await activeUserContext(createRequestId()), {
    limit: 100,
    ...query,
  });
  return (
    <>
      <PageHeader
        title="Products"
        description="Canonical catalogue and server-trusted variant prices."
      />
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Add product</h2>
        <form action={createProductAction} className="form form-inline">
          <div className="form-row">
            <label htmlFor="product-name">Name</label>
            <Input id="product-name" name="name" required />
          </div>
          <div className="form-row">
            <label htmlFor="product-slug">Slug</label>
            <Input id="product-slug" name="slug" required />
          </div>
          <div className="form-row">
            <label htmlFor="sku">SKU</label>
            <Input id="sku" name="sku" required />
          </div>
          <div className="form-row">
            <label htmlFor="variant-title">Variant</label>
            <Input id="variant-title" name="variant_title" defaultValue="Standard" required />
          </div>
          <div className="form-row">
            <label htmlFor="amount">Price in minor units</label>
            <Input id="amount" name="unit_amount" inputMode="numeric" required />
          </div>
          <div className="form-row">
            <label htmlFor="currency">Currency</label>
            <Input id="currency" name="currency" defaultValue="NGN" maxLength={3} required />
          </div>
          <Button type="submit">Add draft product</Button>
        </form>
      </section>
      <form className="filter-bar">
        <Input name="search" defaultValue={query.search} placeholder="Search product or slug" />
        <Select name="status" defaultValue={query.status ?? ""}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
        <Button type="submit" className="button-secondary">
          Filter
        </Button>
      </form>
      {!products.data.length ? (
        <EmptyState
          title="No products"
          description="Add a product and variant to build the catalogue."
        />
      ) : (
        <Table label="Products">
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Variants</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.data.map((product) => (
              <tr key={product.id}>
                <td>
                  <Link href={`/commerce/products/${product.id}`}>
                    <strong>{product.name}</strong>
                  </Link>
                  <div className="help">{product.slug}</div>
                </td>
                <td>
                  <Badge
                    tone={
                      product.status === "active"
                        ? "success"
                        : product.status === "archived"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {product.status}
                  </Badge>
                </td>
                <td>{product.variants.length}</td>
                <td>
                  {product.variants[0]
                    ? formatMinorAmount(
                        product.variants[0].unit_amount,
                        product.variants[0].currency,
                      )
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
