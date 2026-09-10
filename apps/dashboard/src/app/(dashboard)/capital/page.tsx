import { capitalProfileHistory, currentCapitalProfile } from "@yinne/capital";
import { createRequestId } from "@yinne/core";
import { Badge, PageHeader } from "@yinne/ui";
import { activeUserContext } from "../../../lib/context";

function title(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export default async function CapitalPage() {
  const context = await activeUserContext(createRequestId());
  const [profile, history] = await Promise.all([
    currentCapitalProfile(context),
    capitalProfileHistory(context, 12),
  ]);
  if (!profile)
    return (
      <>
        <PageHeader
          title="Capital"
          description="Explainable merchant intelligence derived from canonical Analytics."
        />
        <section className="notice">
          <strong>No Capital Profile yet.</strong> An authorized financial administrator can request
          the first worker-backed calculation through the Capital API.
        </section>
      </>
    );
  return (
    <>
      <PageHeader
        title="Capital"
        description="Observed business stability—not a credit decision, approval, or financing offer."
      />
      <section className="notice">
        <strong>Important:</strong> This profile only reflects activity Yinne can observe. It is not
        lender underwriting and does not guarantee financing.
      </section>
      <div className="card-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <Badge tone={profile.status === "scored" ? "success" : "warning"}>
            {title(profile.status)}
          </Badge>
          <h2>{profile.score ?? "—"}</h2>
          <strong>Capital Score</strong>
          <p>{profile.band ? title(profile.band) : "Insufficient data—not poor performance"}</p>
        </div>
        <div className="card">
          <strong>Data sufficiency</strong>
          <h2>{title(profile.data_sufficiency)}</h2>
          <p>{profile.missing_requirements.join(" · ") || "Scoring requirements are met."}</p>
        </div>
        <div className="card">
          <strong>Last updated</strong>
          <h2>{new Date(profile.calculated_at).toLocaleDateString()}</h2>
          <p>
            {profile.model_version} · {profile.currency}
          </p>
        </div>
        <div className="card">
          <strong>Score change</strong>
          <h2>
            {profile.score_change
              ? `${profile.score_change.delta >= 0 ? "+" : ""}${profile.score_change.delta}`
              : "—"}
          </h2>
          <p>
            {profile.score_change
              ? "Since the previous comparable snapshot"
              : "No comparable prior snapshot"}
          </p>
        </div>
      </div>
      <div className="split" style={{ marginTop: 20 }}>
        <section className="panel">
          <h2>Strengths</h2>
          {profile.strengths.length ? (
            <ul>
              {profile.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No strengths are asserted until sufficient evidence exists.</p>
          )}
        </section>
        <section className="panel">
          <h2>Watch areas</h2>
          {profile.watch_areas.length ? (
            <ul>
              {profile.watch_areas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No watch areas under the current rules.</p>
          )}
        </section>
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>Dimension breakdown</h2>
        <div className="table-wrap">
          <table aria-label="Capital dimensions">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Score</th>
                <th>Weight</th>
                <th>Contribution</th>
              </tr>
            </thead>
            <tbody>
              {profile.dimensions.map((item) => (
                <tr key={item.key}>
                  <td>{item.label}</td>
                  <td>{item.score.toFixed(0)}</td>
                  <td>{item.effective_weight.toFixed(1)}%</td>
                  <td>{item.contribution.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>Signal explanations</h2>
        {profile.signals.map((signal) => (
          <details key={signal.key}>
            <summary>
              <strong>{title(signal.key)}</strong> ·{" "}
              {signal.normalized_score ?? title(signal.status)}
            </summary>
            <p>{signal.explanation}</p>
            <p>
              <small>
                Raw aggregate: {JSON.stringify(signal.raw)} · base weight {signal.base_weight}% ·
                contribution {signal.contribution}
              </small>
            </p>
          </details>
        ))}
      </section>
      <section className="panel" style={{ marginTop: 20 }}>
        <h2>Profile history</h2>
        <div className="table-wrap">
          <table aria-label="Capital profile history">
            <thead>
              <tr>
                <th>Calculated</th>
                <th>Score</th>
                <th>Band</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.calculated_at).toLocaleString()}</td>
                  <td>{item.score ?? "Insufficient"}</td>
                  <td>{item.band ? title(item.band) : "—"}</td>
                  <td>{item.model_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="notice" style={{ marginTop: 20 }}>
        <strong>Limitations</strong>
        <ul>
          {profile.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
