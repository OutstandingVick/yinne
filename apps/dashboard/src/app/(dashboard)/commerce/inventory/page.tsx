import { Button, EmptyState, Input, PageHeader, Select, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getOrderCreationOptions, listInventoryLevels } from "@yinne/commerce";
import { activeUserContext } from "../../../../lib/context";
import { adjustInventoryAction } from "../../actions";
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; location_id?: string }>;
}) {
  const query = await searchParams;
  const context = await activeUserContext(createRequestId());
  const [levels, options] = await Promise.all([
    listInventoryLevels(context, { limit: 100, ...query }),
    getOrderCreationOptions(context),
  ]);
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Per-location on-hand stock. Every change creates an immutable movement and negative stock is rejected."
      />
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Adjust stock</h2>
        <form action={adjustInventoryAction} className="form form-inline">
          <div className="form-row">
            <label htmlFor="inventory-variant">Variant</label>
            <Select id="inventory-variant" name="variant_id" required>
              {options.variants.map((variant) => (
                <option value={variant.id} key={variant.id}>
                  {variant.product_name} · {variant.title} ({variant.sku})
                </option>
              ))}
            </Select>
          </div>
          <div className="form-row">
            <label htmlFor="inventory-location">Location</label>
            <Select id="inventory-location" name="location_id" required>
              {options.locations.map((location) => (
                <option value={location.id} key={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="form-row">
            <label htmlFor="delta">Delta</label>
            <Input
              id="delta"
              name="delta"
              inputMode="numeric"
              pattern="-?[1-9][0-9]*"
              placeholder="e.g. 10 or -2"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="reason">Reason</label>
            <Input id="reason" name="reason" minLength={2} maxLength={240} required />
          </div>
          <Button type="submit">Record adjustment</Button>
        </form>
      </section>
      <form className="filter-bar">
        <Input
          name="search"
          defaultValue={query.search}
          placeholder="Search product, SKU, or location"
        />
        <Select name="location_id" defaultValue={query.location_id ?? ""}>
          <option value="">All locations</option>
          {options.locations.map((location) => (
            <option value={location.id} key={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
        <Button type="submit" className="button-secondary">
          Filter
        </Button>
      </form>
      {!levels.data.length ? (
        <EmptyState
          title="No inventory levels"
          description="Make an opening-stock adjustment to create a level."
        />
      ) : (
        <Table label="Inventory levels">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Location</th>
              <th>On hand</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {levels.data.map((level) => (
              <tr key={level.id}>
                <td>
                  <strong>{level.product_name}</strong>
                  <div className="help">
                    {level.variant_title} · {level.sku}
                  </div>
                </td>
                <td>{level.location_name}</td>
                <td className="mono">{level.on_hand}</td>
                <td>{level.version}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
