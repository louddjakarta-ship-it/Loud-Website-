import { cn } from "@/lib/cn";

function Group({ phrase, count }: { phrase: string; count: number }) {
  return (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="flex items-center whitespace-nowrap font-display text-[clamp(1.5rem,3vw,2.5rem)] uppercase leading-none tracking-tight"
        >
          {phrase}
          <span
            aria-hidden="true"
            className="mx-6 inline-block h-2 w-2 shrink-0 rounded-full bg-current opacity-70"
          />
        </span>
      ))}
    </div>
  );
}

export function Marquee({
  phrase,
  tone = "accent",
  slow = false,
  className,
}: {
  phrase: string;
  tone?: "accent" | "light" | "dark";
  slow?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden border-y py-4",
        tone === "accent" && "border-ink/10 bg-accent text-ink",
        tone === "light" && "border-line bg-bone text-paper",
        tone === "dark" && "border-white/10 bg-ink text-paper",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max",
          slow ? "animate-marquee-slow" : "animate-marquee",
        )}
      >
        <Group phrase={phrase} count={6} />
        <Group phrase={phrase} count={6} />
      </div>
    </div>
  );
}
