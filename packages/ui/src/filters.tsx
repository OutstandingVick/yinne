import type { FormHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

export function FilterBar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`filter-bar ${className}`} {...props} />;
}

export function FilterForm({ className = "", ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return <form className={`filter-bar core-filter-form ${className}`} {...props} />;
}

export function DateInput({
  label,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  return (
    <label className="form-row date-control">
      <span className="label">{label}</span>
      <input {...props} type="date" className={`input ${className}`} />
    </label>
  );
}
