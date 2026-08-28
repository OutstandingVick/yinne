import { PageHeader } from "@yinne/ui";
import { auth } from "../../../auth";

export default async function ProfilePage() {
  const session = await auth();
  return (
    <>
      <PageHeader
        title="Profile"
        description="Identity is global; permissions come from organization membership and scoped role assignments."
      />
      <section className="card">
        <h2>{session?.user.name ?? "Yinne user"}</h2>
        <p>{session?.user.email}</p>
        <p className="mono">{session?.user.id}</p>
      </section>
    </>
  );
}
