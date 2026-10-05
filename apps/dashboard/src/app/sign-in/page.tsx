import Image from "next/image";
import { SignInForm } from "./sign-in-form";
import "../(dashboard)/fonts.css";
import "./sign-in.css";

const highlights = ["Orders & inventory", "Payments & refunds", "Invoices & subscriptions"];

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <aside className="auth-brand" aria-hidden="true">
          <Image
            className="auth-brand-icon"
            src="/brand/yinne-icon.svg"
            alt=""
            width={56}
            height={56}
            priority
          />
          <p className="auth-brand-title">Commerce and payments, in one calm place.</p>
          <ul className="auth-brand-highlights">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <span className="auth-brand-orb auth-brand-orb-yellow" />
          <span className="auth-brand-orb auth-brand-orb-vanilla" />
        </aside>
        <div className="auth-panel">
          <Image
            className="auth-logo"
            src="/brand/yinne-logo.svg"
            alt="Yinne"
            width={130}
            height={27}
            priority
          />
          <span className="auth-mode">Test mode</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage orders, payments and payouts for your business.</p>
          <SignInForm />
        </div>
      </section>
    </main>
  );
}
