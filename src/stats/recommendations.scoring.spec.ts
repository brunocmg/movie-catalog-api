import { Candidate, quality, scoreCandidates } from './recommendations.scoring';

const candidate = (over: Partial<Candidate> & { id: number }): Candidate => ({
  year: 2000,
  ratingCount: 0,
  ratingSum: 0,
  genreIds: [],
  ...over,
});

describe('recommendations scoring', () => {
  describe('quality', () => {
    it('starts from the prior and moves with the ratings', () => {
      expect(quality(0, 0)).toBeCloseTo(0.6);
      expect(quality(30, 3)).toBeCloseTo(0.8);
      expect(quality(3, 3)).toBeCloseTo(0.35);
    });

    it('does not let a single 10 beat many 9s', () => {
      expect(quality(10, 1)).toBeLessThan(quality(90, 10));
    });
  });

  describe('scoreCandidates', () => {
    const affinity = new Map([
      [1, 3],
      [2, 1],
    ]);

    it('sums the affinity of the matched genres', () => {
      const [top, second] = scoreCandidates(
        [
          candidate({ id: 1, genreIds: [2] }),
          candidate({ id: 2, genreIds: [1, 2] }),
        ],
        affinity,
      );

      expect(top).toMatchObject({ id: 2, matchedGenreIds: [1, 2], score: 2.4 });
      expect(second).toMatchObject({ id: 1, matchedGenreIds: [2], score: 0.6 });
    });

    it('drops titles that match no genre of the profile', () => {
      const result = scoreCandidates(
        [candidate({ id: 1, genreIds: [9] }), candidate({ id: 2 })],
        affinity,
      );

      expect(result).toEqual([]);
    });

    it('lets a better rating win between equal matches', () => {
      const result = scoreCandidates(
        [
          candidate({ id: 1, genreIds: [1] }),
          candidate({ id: 2, genreIds: [1], ratingCount: 5, ratingSum: 45 }),
        ],
        affinity,
      );

      expect(result.map((r) => r.id)).toEqual([2, 1]);
    });

    it('breaks ties by year and then by id', () => {
      const result = scoreCandidates(
        [
          candidate({ id: 3, genreIds: [1], year: 1990 }),
          candidate({ id: 2, genreIds: [1], year: 2010 }),
          candidate({ id: 1, genreIds: [1], year: 2010 }),
        ],
        affinity,
      );

      expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('falls back to the quality alone without a taste profile', () => {
      const result = scoreCandidates(
        [
          candidate({ id: 1, genreIds: [1] }),
          candidate({ id: 2, ratingCount: 4, ratingSum: 40 }),
        ],
        new Map(),
      );

      expect(result.map((r) => r.id)).toEqual([2, 1]);
      expect(result[0].matchedGenreIds).toEqual([]);
    });
  });
});
