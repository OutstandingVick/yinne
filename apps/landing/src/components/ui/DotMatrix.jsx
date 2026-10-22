import { useMemo } from "react";

const SIZE = 29;

/**
 * A dot-matrix globe drawn from a grid of dots: points on a sphere that sit near a meridian or
 * parallel are kept, giving parse.bot's bitmap globe in Yinne cobalt with canary highlights.
 */
export default function DotMatrix() {
  const dots = useMemo(() => {
    const result = [];
    const radius = (SIZE - 1) / 2;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const x = (col - radius) / radius;
        const y = (row - radius) / radius;
        const rr = x * x + y * y;
        if (rr > 1) continue;
        const z = Math.sqrt(1 - rr);
        const lon = Math.atan2(x, z) + 0.35;
        const lat = Math.asin(y);
        const onMeridian = Math.abs(Math.sin(lon * 3)) < 0.18;
        const onParallel = Math.abs(Math.sin(lat * 4)) < 0.16;
        const rim = rr > 0.86;
        if (onMeridian || onParallel || rim) {
          const highlight = (row * 7 + col * 3) % 23 === 0;
          result.push({ row, col, highlight, depth: 0.35 + z * 0.65 });
        }
      }
    }
    return new Map(result.map((dot) => [dot.row * SIZE + dot.col, dot]));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="grid aspect-square w-full max-w-[460px]"
      style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: SIZE * SIZE }, (_, index) => {
        const dot = dots.get(index);
        return (
          <span key={index} className="flex items-center justify-center">
            {dot ? (
              <span
                className={`block h-[62%] w-[62%] rounded-[1px] ${dot.highlight ? "bg-canary ring-1 ring-ink/80" : "bg-cobalt"}`}
                style={{ opacity: dot.highlight ? 1 : dot.depth }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
