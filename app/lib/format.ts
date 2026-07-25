const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
  ["second", 1000],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";

  const diffMs = new Date(iso).getTime() - Date.now();

  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (Math.abs(diffMs) >= unitMs || unit === "second") {
      return relativeTimeFormatter.format(Math.round(diffMs / unitMs), unit);
    }
  }

  return "just now";
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function dateParts(date: Date, timeZone: string): Record<string, string> {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
}

/** "MMM DD, YYYY HH:mm" in the given IANA timezone (merchant's Settings >
 * General timezone), falling back to "Never" for unset dates. */
export function formatAbsoluteDate(
  value: string | Date | null,
  timeZone = "UTC",
): string {
  if (!value) return "Never";
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = dateParts(date, timeZone);
  return `${parts.month} ${parts.day}, ${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Minutes a timezone is ahead of UTC at the given instant (DST-aware). */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}

/** Converts a "YYYY-MM-DD" date-filter input (a calendar day picked in the
 * merchant's own timezone) into the UTC instant of that day's local start
 * or end — so "Created from <date>" lines up with the same timezone the
 * Created/Updated columns are displayed in, instead of drifting by the
 * merchant's UTC offset near midnight. */
export function zonedDayBoundary(
  dateStr: string,
  timeZone: string,
  edge: "start" | "end",
): Date {
  const [y = 1970, m = 1, d = 1] = dateStr.split("-").map(Number);
  const guess =
    edge === "start"
      ? Date.UTC(y, m - 1, d, 0, 0, 0, 0)
      : Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  const offsetMinutes = zoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offsetMinutes * 60_000);
}
