// Playtest times in the viewer's own time zone (DESIGN §7.1).

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const zoneFmt = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' });

export function dayLabel(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function zoneName(d: Date): string {
  return zoneFmt.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/** "7:00 – 8:00 PM PDT" style range, in local time. */
export function timeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${timeFmt.format(start)} – ${timeFmt.format(end)} ${zoneName(end)}`.trim();
}

export function whenLabel(startIso: string, endIso: string): string {
  return `${dayLabel(startIso)}, ${timeRange(startIso, endIso)}`;
}

export function lengthLabel(minutes: number): string {
  if (minutes % 60 === 0) return minutes === 60 ? '1 hour' : `${minutes / 60} hours`;
  return minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
