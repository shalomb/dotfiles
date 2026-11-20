// Habit- & time-aware doc ranking (vision-and-roadmap §8). Pure: `now` is a parameter, no I/O.
export interface RankDoc {
  id: string;
  /** base relevance from the search/match stage */
  match: number;
  /** epoch-ms timestamps of past opens */
  accesses?: number[];
  living?: boolean;
  status?: string;
}
export interface Ranked extends RankDoc {
  score: number;
}

export const WINDOW_MIN = 45;
export const WEEKDAY_WEIGHT = 1;
export const ANYDAY_WEIGHT = 0.4;
export const STATUS_BONUS = 0.75;
const DAY_MIN = 1440;
const HALF_LIFE_DAYS = 28;

const minuteOfDay = (t: number) => Math.floor(t / 60000) % DAY_MIN;
const weekday = (t: number) => (Math.floor(t / 86400000) + 4) % 7; // UTC; epoch was Thursday

/** Sum of recency-decayed proximity of past accesses to now's time-of-day (weekday match weighs more). */
export function habitScore(accesses: number[], now: number): number {
  let s = 0;
  for (const t of accesses) {
    if (t > now) continue;
    const d = Math.abs(minuteOfDay(t) - minuteOfDay(now));
    const dist = Math.min(d, DAY_MIN - d);
    if (dist > WINDOW_MIN) continue;
    const closeness = 1 - dist / (WINDOW_MIN + 1);
    const w = weekday(t) === weekday(now) ? WEEKDAY_WEIGHT : ANYDAY_WEIGHT;
    const decay = Math.pow(0.5, (now - t) / 86400000 / HALF_LIFE_DAYS);
    s += closeness * w * decay;
  }
  return s;
}

export function rankDocs(docs: RankDoc[], now: number): Ranked[] {
  return docs
    .map((d) => {
      const bubble = d.living && d.status === "active" ? STATUS_BONUS : 0;
      return { ...d, score: d.match + habitScore(d.accesses ?? [], now) + bubble };
    })
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
