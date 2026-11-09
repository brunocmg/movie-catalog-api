import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Drama', 'drama'],
    ['Ação', 'acao'],
    ['  Sci-Fi & Fantasy ', 'sci-fi-fantasy'],
    ['Ficção Científica', 'ficcao-cientifica'],
    ['---', ''],
  ])('%p -> %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
