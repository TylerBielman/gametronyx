// In-memory sliding window, like the accounts API's: one process, so this is abuse smoothing, not a boundary.

export class SlidingWindow {
  private hits = new Map<string, number[]>();

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    private now: () => number = Date.now,
  ) {}

  /** Record a hit; returns seconds to wait when the window was already full (the hit is then not recorded). */
  take(key: string): number {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((at) => at > t - this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - t) / 1000));
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.hits.clear();
    return 0;
  }
}
