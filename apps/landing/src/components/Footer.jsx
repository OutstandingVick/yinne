/** Section 4: closing statement, call to action, links and the legal line. */
export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1320px] px-4 pt-24 sm:px-6 lg:pt-32">
        <div className="flex flex-col gap-2 py-8 font-bit text-[10px] uppercase tracking-[0.14em] text-gray-400 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Yinne</span>
          <span>Test mode · No real financial execution</span>
        </div>
      </div>
    </footer>
  );
}
