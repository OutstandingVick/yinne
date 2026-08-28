import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark">Y</span> Yinne
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to the Phase 1 platform foundation. No financial modules are active.</p>
        <SignInForm />
      </section>
    </main>
  );
}
