import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { detectImageType } from './image';
import { LocalStorage } from './local.storage';

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.alloc(4),
  Buffer.from('WEBPVP8 '),
]);

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP by their signature', () => {
    expect(detectImageType(JPEG)).toBe('jpeg');
    expect(detectImageType(PNG)).toBe('png');
    expect(detectImageType(WEBP)).toBe('webp');
  });

  it.each([
    ['text', Buffer.from('<html></html>')],
    ['gif', Buffer.from('GIF89a......')],
    ['svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    [
      'a RIFF that is not WebP',
      Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.alloc(4),
        Buffer.from('WAVEfmt '),
      ]),
    ],
    ['an empty file', Buffer.alloc(0)],
  ])('rejects %s', (_, buffer) => {
    expect(detectImageType(buffer)).toBeNull();
  });
});

describe('LocalStorage', () => {
  let root: string;
  let storage: LocalStorage;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-'));
    storage = new LocalStorage(root);
  });

  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('writes the file and returns the path served by the API', async () => {
    const url = await storage.saveImage({
      folder: 'avatars',
      name: '7',
      buffer: PNG,
      type: 'png',
    });

    expect(url).toBe('/files/avatars/7.png');
    expect(await fs.readFile(path.join(root, 'avatars', '7.png'))).toEqual(PNG);
  });

  it('replaces the previous image even when the format changes', async () => {
    await storage.saveImage({
      folder: 'avatars',
      name: '7',
      buffer: PNG,
      type: 'png',
    });
    await storage.saveImage({
      folder: 'avatars',
      name: '7',
      buffer: JPEG,
      type: 'jpeg',
    });

    expect(await fs.readdir(path.join(root, 'avatars'))).toEqual(['7.jpg']);
  });

  it('deletes the image and ignores a missing one', async () => {
    await storage.saveImage({
      folder: 'posters',
      name: '3',
      buffer: PNG,
      type: 'png',
    });

    await storage.deleteImage('posters', '3');
    await storage.deleteImage('posters', '3');

    expect(await fs.readdir(path.join(root, 'posters'))).toEqual([]);
  });
});
