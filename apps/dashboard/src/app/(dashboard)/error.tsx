"use client";

import { Button, CoreScreen, ErrorState } from "@yinne/ui";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <CoreScreen className="dashboard-error-screen">
      <ErrorState />
      <div className="dashboard-error-actions">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </CoreScreen>
  );
}
