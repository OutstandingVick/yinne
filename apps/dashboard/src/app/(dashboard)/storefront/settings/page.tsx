import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Button, PageHeader } from "@yinne/ui";
import { createRequestId } from "@yinne/core";
import { updateStoreSchema } from "@yinne/contracts";
import { getStore, updateStore } from "@yinne/storefront";
import { activeUserContext } from "../../../../lib/context";

async function saveStore(formData: FormData) {
  "use server";
  const nullable = (name: string) => String(formData.get(name) ?? "").trim() || null;
  await updateStore(
    await activeUserContext(createRequestId()),
    updateStoreSchema.parse({
      public_name: formData.get("public_name"),
      slug: formData.get("slug"),
      description: nullable("description"),
      logo_url: nullable("logo_url"),
      contact_email: nullable("contact_email"),
      contact_phone: nullable("contact_phone"),
    }),
  );
  revalidatePath("/storefront");
  redirect("/storefront");
}

export default async function StoreSettingsPage() {
  const store = await getStore(await activeUserContext(createRequestId()));
  return (
    <>
      <PageHeader
        title="Store settings"
        description="Safe public identity and contact settings. Custom code and domains are not supported."
      />
      <form action={saveStore} className="card form-grid">
        <label>
          Public name
          <input name="public_name" defaultValue={store.public_name} required maxLength={160} />
        </label>
        <label>
          Slug
          <input
            name="slug"
            defaultValue={store.slug}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </label>
        <label className="full">
          Description
          <textarea name="description" defaultValue={store.description ?? ""} maxLength={2000} />
        </label>
        <label>
          HTTPS logo URL
          <input name="logo_url" type="url" defaultValue={store.logo_url ?? ""} />
        </label>
        <label>
          Contact email
          <input name="contact_email" type="email" defaultValue={store.contact_email ?? ""} />
        </label>
        <label>
          Contact phone
          <input name="contact_phone" defaultValue={store.contact_phone ?? ""} />
        </label>
        <div className="full">
          <Button type="submit">Save store</Button>
        </div>
      </form>
    </>
  );
}
