const styles = {
  primary: "bg-ink text-white hover:bg-cobalt",
  secondary: "border border-gray-200 bg-white text-ink hover:border-ink",
  cobalt: "bg-cobalt text-white hover:bg-ink",
  light: "bg-white text-ink hover:bg-vanilla",
};

/** Square-cornered uppercase mono button with an optional trailing arrow. */
export default function Button({ href, variant = "primary", arrow = false, children }) {
  return (
    <a
      href={href}
      className={`inline-flex h-12 items-center gap-2 rounded-[4px] px-6 font-mono text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${styles[variant]}`}
    >
      {children}
    </a>
  );
}
