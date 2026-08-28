"use client";

import { Button, ErrorState } from "@yinne/ui";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <ErrorState />
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </>
  );
}
