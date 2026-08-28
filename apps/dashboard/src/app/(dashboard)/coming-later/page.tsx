import { EmptyState, PageHeader } from "@yinne/ui";

export default async function ComingLater({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area = "This module" } = await searchParams;
  return (
    <>
      <PageHeader
        title={area}
        description="This navigation boundary is reserved by the approved information architecture."
      />
      <EmptyState
        title="Not available in this release"
        description="Phase 1 establishes the trustworthy platform foundation. No fake data or simulated product behavior is shown here."
      />
    </>
  );
}
