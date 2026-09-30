import Link from "next/link";
import { CoreScreen, SectionCard, StatusBadge, Table } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { getMarketplaceProfile, listMarketplaceListings } from "@yinne/marketplace";
import { activeUserContext } from "../../../../lib/context";
export const dynamic = "force-dynamic";
export default async function MarketplaceManagePage() {
  const context = await activeUserContext(createRequestId());
  let profile: null | Awaited<ReturnType<typeof getMarketplaceProfile>> = null;
  try {
    profile = await getMarketplaceProfile(context);
  } catch {
    profile = null;
  }
  const listings = profile ? await listMarketplaceListings(context) : [];
  return (
    <CoreScreen className="module-screen">
      <header className="page-header">
        <div>
          <p className="eyebrow">Optional sales channel</p>
          <h1>Marketplace</h1>
          <p>Publish canonical Storefront products for discovery across Yinne.</p>
        </div>
        <Link className="button" href="/marketplace">
          View public Marketplace
        </Link>
      </header>
      {!profile ? (
        <SectionCard>
          <h2>Marketplace is not enabled</h2>
          <p>
            Accept the Marketplace terms and verify your merchant contact through the API to opt in.
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard>
            <div className="detail-row">
              <div>
                <span>Public merchant</span>
                <strong>{profile.public_name}</strong>
              </div>
              <StatusBadge tone={profile.suspended ? "danger" : "success"}>
                {profile.suspended ? "Suspended" : "Enabled"}
              </StatusBadge>
            </div>
            <p>{profile.description}</p>
          </SectionCard>
          <SectionCard>
            <h2>Listings</h2>
            {!listings.length ? (
              <p>No listings yet.</p>
            ) : (
              <Table label="Marketplace listings" density="compact">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Eligibility</th>
                    <th>Public</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td>{l.title ?? l.product_id}</td>
                      <td>
                        <StatusBadge tone={l.status === "approved" ? "success" : "neutral"}>
                          {l.status}
                        </StatusBadge>
                      </td>
                      <td>
                        {Object.keys(l.eligibility).length ? "Evaluated" : "Pending submission"}
                      </td>
                      <td>
                        {l.status === "approved" ? (
                          <Link href={`/marketplace/listings/${l.id}`}>View</Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </SectionCard>
        </>
      )}
    </CoreScreen>
  );
}
