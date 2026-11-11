// Prior for the community average, so one 10 does not outrank fifty 9s
export const PRIOR_MEAN = 6;
export const PRIOR_WEIGHT = 3;

export interface Candidate {
  id: number;
  year: number;
  ratingCount: number;
  ratingSum: number;
  genreIds: number[];
}

export interface Scored {
  id: number;
  score: number;
  matchedGenreIds: number[];
}

export const quality = (ratingSum: number, ratingCount: number): number =>
  (ratingSum + PRIOR_MEAN * PRIOR_WEIGHT) / (ratingCount + PRIOR_WEIGHT) / 10;

/**
 * Taste match (sum of the affinity of the title's genres) weighted by the
 * community rating. Without any affinity the quality alone ranks the titles.
 */
export function scoreCandidates(
  candidates: Candidate[],
  affinity: Map<number, number>,
): Scored[] {
  return candidates
    .map((c) => {
      const matchedGenreIds = c.genreIds.filter((g) => affinity.has(g));
      const taste = matchedGenreIds.reduce(
        (sum, g) => sum + (affinity.get(g) ?? 0),
        0,
      );
      const q = quality(c.ratingSum, c.ratingCount);
      const score = affinity.size === 0 ? q : taste * q;
      return {
        id: c.id,
        year: c.year,
        score: Math.round(score * 100) / 100,
        matchedGenreIds,
      };
    })
    .filter((s) => affinity.size === 0 || s.matchedGenreIds.length > 0)
    .sort((a, b) => b.score - a.score || b.year - a.year || a.id - b.id)
    .map(({ id, score, matchedGenreIds }) => ({ id, score, matchedGenreIds }));
}
