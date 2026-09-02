import Link from "next/link";

export const metadata = { title: "Order confirmed", robots: { index: false } };

export default async function StoreConfirmation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="store-shell">
      <section className="store-confirmation" role="status">
        <p className="eyebrow">Payment completed</p>
        <h1>Thank you for your order</h1>
        <p>
          Your payment was successful. The merchant can now see the canonical order, payment,
          transaction, and inventory update in Yinne.
        </p>
        <Link className="store-checkout" href={`/store/${slug}`}>
          Return to store
        </Link>
      </section>
    </main>
  );
}
