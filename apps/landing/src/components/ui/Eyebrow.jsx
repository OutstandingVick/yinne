/** Tiny "+ LABEL" marker that opens each section, as on parse.bot. */
export default function Eyebrow({ children, tone = "light" }) {
  return (
    <p
      className={`font-bit text-[11px] uppercase tracking-[0.14em] ${
        tone === "dark" ? "text-white/60" : "text-gray-500"
      }`}
    >
      + {children}
    </p>
  );
}
