import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TitleType } from '@prisma/client';
import { TmdbClient } from './tmdb.client';

const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('TmdbClient', () => {
  const fetchMock = jest.spyOn(global, 'fetch');
  const make = (token: string | undefined = 'secret') =>
    new TmdbClient({ get: () => token } as unknown as ConfigService);

  beforeEach(() => fetchMock.mockReset());
  afterAll(() => fetchMock.mockRestore());

  it('refuses to call TMDB without a token', async () => {
    await expect(make('').search(TitleType.MOVIE, 'x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalises a movie and sends the bearer token', async () => {
    fetchMock.mockReturnValue(
      respond({
        id: 550,
        title: ' Fight Club ',
        release_date: '1999-10-15',
        overview: '',
        poster_path: '/fc.jpg',
        runtime: 139,
        genres: [{ name: 'Drama' }],
        credits: {
          cast: [{ name: 'Brad Pitt', character: 'Tyler', order: 0 }],
          crew: [
            { job: 'Producer', name: 'X' },
            { job: 'Director', name: 'David Fincher' },
          ],
        },
      }),
    );

    const movie = await make().getTitle(TitleType.MOVIE, 550);

    expect(movie).toMatchObject({
      tmdbId: 550,
      name: 'Fight Club',
      year: 1999,
      overview: null,
      posterUrl: 'https://image.tmdb.org/t/p/w500/fc.jpg',
      runtimeMinutes: 139,
      director: 'David Fincher',
      genres: ['Drama'],
      seasons: [],
    });
    expect(movie.cast[0]).toMatchObject({ name: 'Brad Pitt', position: 0 });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/3/movie/550');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer secret',
    );
  });

  it('loads every season of a series', async () => {
    fetchMock
      .mockReturnValueOnce(
        respond({
          id: 1,
          name: 'Dark',
          first_air_date: '2017-12-01',
          episode_run_time: [50],
          created_by: [{ name: 'A' }, { name: 'B' }],
          seasons: [{ season_number: 1, name: 'Season 1' }],
        }),
      )
      .mockReturnValueOnce(
        respond({
          episodes: [
            { episode_number: 1, name: '', runtime: 0 },
            { episode_number: 2, name: 'Lies', runtime: 52 },
          ],
        }),
      );

    const series = await make().getTitle(TitleType.SERIES, 1);

    expect(series.director).toBe('A, B');
    expect(series.runtimeMinutes).toBe(50);
    expect(series.seasons[0].episodes).toEqual([
      { number: 1, name: 'Episode 1', runtimeMinutes: null },
      { number: 2, name: 'Lies', runtimeMinutes: 52 },
    ]);
  });

  it('keeps a missing release date as a null year', async () => {
    fetchMock.mockReturnValue(respond({ results: [{ id: 1, title: 'X' }] }));

    const [result] = await make().search(TitleType.MOVIE, 'x');

    expect(result.year).toBeNull();
  });

  it('maps TMDB errors', async () => {
    fetchMock.mockReturnValueOnce(respond({}, 404));
    await expect(make().getTitle(TitleType.MOVIE, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    fetchMock.mockReturnValueOnce(respond({}, 401));
    await expect(make().getTitle(TitleType.MOVIE, 1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );

    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(make().getTitle(TitleType.MOVIE, 1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
