import { PageHeader } from "@yinne/ui";
import { providerCapabilities } from "@yinne/payments";
export default function MockProviderPage() {
  return (
    <>
      <PageHeader
        title="Deterministic Mock Provider"
        description="A deliberate provider adapter for safe, repeatable test-mode payment lifecycles."
      />
      <div className="notice">
        <strong>Test-only:</strong> Mock Provider cannot be configured in live mode and never
        contacts an external payment API.
      </div>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Capabilities</h2>
        <p>{providerCapabilities.join(" · ")}</p>
        <h2>Payment scenarios</h2>
        <ul>
          <li>
            <code>success</code> — definitive succeeded charge
          </li>
          <li>
            <code>failure:declined</code> — definitive normalized decline
          </li>
          <li>
            <code>pending:then_success</code> — pending, later resolved by signed webhook
          </li>
          <li>
            <code>pending:then_failure</code> — pending, later failed by signed webhook
          </li>
          <li>
            <code>timeout:then_success</code> — unknown/pending, reconciled by webhook
          </li>
        </ul>
        <h2>Refund scenarios</h2>
        <p>
          <code>refund_success</code> · <code>refund_failure</code>
        </p>
        <p className="help">
          Provider references derive from attempt/refund IDs. Duplicate signed event IDs are
          acknowledged without repeating financial side effects.
        </p>
      </section>
    </>
  );
}
