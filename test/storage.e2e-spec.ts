import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  SaveImageInput,
  StorageFolder,
  StorageService,
} from '../src/storage/storage.service';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

class FakeStorage extends StorageService {
  readonly files = new Map<string, Buffer>();

  saveImage({ folder, name, buffer }: SaveImageInput): Promise<string> {
    this.files.set(`${folder}/${name}`, buffer);
    return Promise.resolve(`https://cdn.example/${folder}/${name}`);
  }

  deleteImage(folder: StorageFolder, name: string): Promise<void> {
    this.files.delete(`${folder}/${name}`);
    return Promise.resolve();
  }
}

// Nest sniffs the content too, so these are real 1x1 images
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

describe('Image uploads (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let user: string;
  let userId: number;
  let movieId: number;
  const storage = new FakeStorage();

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const uploadAvatar = (
    token: string,
    file: Buffer,
    contentType = 'image/png',
  ) =>
    http()
      .post('/users/upload')
      .set(as(token))
      .attach('file', file, { filename: 'me.png', contentType });
  const uploadPoster = (
    token: string,
    id: number,
    file: Buffer,
    contentType = 'image/png',
  ) =>
    http()
      .put(`/titles/${id}/poster`)
      .set(as(token))
      .attach('file', file, { filename: 'poster.png', contentType });

  beforeAll(async () => {
    app = await createTestApp((b) =>
      b.overrideProvider(StorageService).useValue(storage),
    );
  });

  beforeEach(async () => {
    storage.files.clear();
    await resetDatabase(app);
    ({ token: admin } = await registerAdminAndLogin(app));
    ({ token: user, id: userId } = await registerAndLogin(app, {
      name: 'Joao',
      email: 'joao@email.com',
      password: '123456',
    }));
    movieId = (
      (
        await http()
          .post('/movies')
          .set(as(admin))
          .send({ name: 'Heat', year: 1995 })
          .expect(201)
      ).body as { id: number }
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('avatar', () => {
    it('stores the image and saves its URL on the user', async () => {
      const res = await uploadAvatar(user, JPEG, 'image/jpeg').expect(201);

      expect(res.body).toMatchObject({
        avatar: `https://cdn.example/avatars/${userId}`,
      });
      expect(storage.files.get(`avatars/${userId}`)).toEqual(JPEG);
      const me = await http().get('/me').set(as(user)).expect(200);
      expect((me.body as { avatar: string }).avatar).toBe(
        `https://cdn.example/avatars/${userId}`,
      );
    });

    it('requires authentication', async () => {
      await http()
        .post('/users/upload')
        .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
        .expect(401);
    });

    it('rejects a declared type that is not an image', async () => {
      await uploadAvatar(user, PNG, 'text/html').expect(422);
      await http().post('/users/upload').set(as(user)).expect(422);
      expect(storage.files.size).toBe(0);
    });

    it('rejects a file whose content is not an image, whatever it claims', async () => {
      await uploadAvatar(user, Buffer.from('<script>alert(1)</script>')).expect(
        415,
      );
      expect(storage.files.size).toBe(0);
    });

    it('rejects a file larger than 3 MB', async () => {
      const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);

      await uploadAvatar(user, big).expect(413);
    });

    it('removes the stored avatar when the account is deleted', async () => {
      await uploadAvatar(user, PNG).expect(201);

      await http().delete(`/users/${userId}`).set(as(user)).expect(204);

      expect(storage.files.has(`avatars/${userId}`)).toBe(false);
    });
  });

  describe('poster', () => {
    it('lets an admin upload and shows it on the title', async () => {
      const res = await uploadPoster(admin, movieId, PNG).expect(200);

      expect(res.body).toMatchObject({
        id: movieId,
        posterUrl: `https://cdn.example/posters/${movieId}`,
      });
      const detail = await http().get(`/movies/${movieId}`).expect(200);
      expect((detail.body as { posterUrl: string }).posterUrl).toBe(
        `https://cdn.example/posters/${movieId}`,
      );
    });

    it('is admin only', async () => {
      await http()
        .put(`/titles/${movieId}/poster`)
        .attach('file', PNG, { filename: 'p.png', contentType: 'image/png' })
        .expect(401);
      await uploadPoster(user, movieId, PNG).expect(403);
      expect(storage.files.size).toBe(0);
    });

    it('rejects unknown titles without storing anything', async () => {
      await uploadPoster(admin, 999, PNG).expect(404);
      await http().put('/titles/abc/poster').set(as(admin)).expect(400);
      expect(storage.files.size).toBe(0);
    });

    it('rejects invalid files', async () => {
      await uploadPoster(admin, movieId, PNG, 'application/pdf').expect(422);
      await uploadPoster(admin, movieId, Buffer.from('GIF89a....')).expect(415);
      await http().put(`/titles/${movieId}/poster`).set(as(admin)).expect(422);
      expect(storage.files.size).toBe(0);
    });

    it('removes the stored poster when the title is deleted', async () => {
      await uploadPoster(admin, movieId, PNG).expect(200);

      await http().delete(`/movies/${movieId}`).set(as(admin)).expect(204);

      expect(storage.files.has(`posters/${movieId}`)).toBe(false);
    });
  });
});
