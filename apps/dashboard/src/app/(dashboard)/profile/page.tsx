import { CoreScreen, PageHeader, SectionCard } from "@yinne/ui";
import { auth } from "../../../auth";

export default async function ProfilePage() {
  const session = await auth();
  return (
    <CoreScreen className="settings-screen">
      <PageHeader
        title="Profile"
        description="Identity is global; permissions come from organization membership and scoped role assignments."
      />
      <SectionCard className="settings-profile-card">
        <h2>{session?.user.name ?? "Yinne user"}</h2>
        <p>{session?.user.email}</p>
        <p className="technical-value">{session?.user.id}</p>
      </SectionCard>
    </CoreScreen>
  );
}
