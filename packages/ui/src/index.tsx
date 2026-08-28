import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export function Button({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes("button", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classes("input", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={classes("input", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={classes("checkbox", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="state-panel">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function ErrorState({ requestId }: { requestId?: string }) {
  return (
    <section className="state-panel state-error" role="alert">
      <h2>Something went wrong</h2>
      <p>Retry safely. If it continues, share request ID {requestId ?? "shown by the API"}.</p>
    </section>
  );
}

export function LoadingState() {
  return (
    <div className="loading" role="status">
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="table-wrap">
      <table aria-label={label}>{children}</table>
    </div>
  );
}
