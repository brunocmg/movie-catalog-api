import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  registerAdminAndLogin,
  registerAndLogin,
  resetDatabase,
} from './utils/test-app';

type ListBody = {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  owner: { id: number; name: string };
};
type ListPage = { data: ListBody[]; meta: { total: number } };
type ItemPage = {
  data: { title: { name: string }; addedAt: string }[];
  meta: { total: number };
};

describe('Custom lists (e2e)', () => {
  let app: INestApplication<App>;
  let admin: string;
  let joao: string;
  let maria: string;
  let heat: number;
  let dark: number;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const createTitle = async (url: string, body: object) =>
    (
      (await http().post(url).set(as(admin)).send(body).expect(201)).body as {
        id: number;
      }
    ).id;
  const createList = async (token: string, body: object) =>
    (await http().post('/me/lists').set(as(token)).send(body).expect(201))
      .body as ListBody;
  const addItem = (token: string, listId: number, titleId: number) =>
    http().put(`/me/lists/${listId}/items/${titleId}`).set(as(token));

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: admin } = await registerAdminAndLogin(app));
    ({ token: joao } = await registerAndLogin(app, {
      name: 'Joao',
      email: 'joao@email.com',
      password: '123456',
    }));
    ({ token: maria } = await registerAndLogin(app, {
      name: 'Maria',
      email: 'maria@email.com',
      password: '123456',
    }));
    heat = await createTitle('/movies', { name: 'Heat', year: 1995 });
    dark = await createTitle('/series', { name: 'Dark', year: 2017 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication to manage lists', async () => {
    await http().post('/me/lists').send({ name: 'x' }).expect(401);
    await http().get('/me/lists').expect(401);
    await http().put(`/me/lists/1/items/${heat}`).expect(401);
  });

  describe('creating', () => {
    it('creates a private list by default and shows the owner', async () => {
      const list = await createList(joao, {
        name: '  Weekend  ',
        description: 'Slow ones',
      });

      expect(list).toMatchObject({
        name: 'Weekend',
        description: 'Slow ones',
        isPublic: false,
        itemCount: 0,
        owner: { name: 'Joao' },
      });
    });

    it('validates the body', async () => {
      const post = (body: object) =>
        http().post('/me/lists').set(as(joao)).send(body);
      await post({}).expect(400);
      await post({ name: '   ' }).expect(400);
      await post({ name: 'x'.repeat(101) }).expect(400);
      await post({ name: 'x', description: 'y'.repeat(501) }).expect(400);
      await post({ name: 'x', isPublic: 'yes' }).expect(400);
      await post({ name: 'x', owner: 1 }).expect(400);
    });

    it('keeps names unique per user, not globally', async () => {
      await createList(joao, { name: 'Favorites' });

      await http()
        .post('/me/lists')
        .set(as(joao))
        .send({ name: 'Favorites' })
        .expect(409);
      await createList(maria, { name: 'Favorites' });
    });

    it('limits the lists per user', async () => {
      const prisma = app.get(PrismaService);
      const me = (await http().get('/me').set(as(joao))).body as { id: number };
      await prisma.list.createMany({
        data: Array.from({ length: 50 }, (_, i) => ({
          userId: me.id,
          name: `List ${i}`,
        })),
      });

      await http()
        .post('/me/lists')
        .set(as(joao))
        .send({ name: 'One too many' })
        .expect(409);
    });
  });

  describe('visibility', () => {
    let publicList: ListBody;
    let privateList: ListBody;

    beforeEach(async () => {
      publicList = await createList(joao, { name: 'Open', isPublic: true });
      privateList = await createList(joao, { name: 'Secret' });
      await addItem(joao, publicList.id, heat).expect(204);
      await addItem(joao, privateList.id, heat).expect(204);
    });

    it('lets anyone read a public list and its items', async () => {
      const list = await http().get(`/lists/${publicList.id}`).expect(200);
      expect(list.body).toMatchObject({ name: 'Open', itemCount: 1 });

      const items = (
        await http().get(`/lists/${publicList.id}/items`).expect(200)
      ).body as ItemPage;
      expect(items.data.map((i) => i.title.name)).toEqual(['Heat']);
    });

    it('hides a private list from everyone but the owner', async () => {
      const url = `/lists/${privateList.id}`;

      await http().get(url).expect(404);
      await http().get(`${url}/items`).expect(404);
      await http().get(url).set(as(maria)).expect(404);
      await http().get(`${url}/items`).set(as(maria)).expect(404);
      await http().get(url).set(as(joao)).expect(200);
      await http().get(`${url}/items`).set(as(joao)).expect(200);
    });

    it('rejects a bad token even on a public list', async () => {
      await http()
        .get(`/lists/${publicList.id}`)
        .set('Authorization', 'Bearer not-a-token')
        .expect(401);
    });

    it('browses only public lists', async () => {
      const page = (await http().get('/lists').expect(200)).body as ListPage;

      expect(page.data.map((l) => l.name)).toEqual(['Open']);
      expect(page.meta.total).toBe(1);
      expect(JSON.stringify(page)).not.toContain('email');
    });

    it('lists my lists, private included, and nobody else', async () => {
      const mine = (await http().get('/me/lists').set(as(joao)).expect(200))
        .body as ListPage;
      const hers = (await http().get('/me/lists').set(as(maria)).expect(200))
        .body as ListPage;

      expect(mine.data.map((l) => l.name).sort()).toEqual(['Open', 'Secret']);
      expect(hers.data).toEqual([]);
    });

    it('can be toggled', async () => {
      await http()
        .patch(`/me/lists/${privateList.id}`)
        .set(as(joao))
        .send({ isPublic: true })
        .expect(200);
      await http().get(`/lists/${privateList.id}`).expect(200);

      await http()
        .patch(`/me/lists/${publicList.id}`)
        .set(as(joao))
        .send({ isPublic: false })
        .expect(200);
      await http().get(`/lists/${publicList.id}`).expect(404);
    });
  });

  describe('items', () => {
    let list: ListBody;

    beforeEach(async () => {
      list = await createList(joao, { name: 'Mix', isPublic: true });
    });

    it('adds idempotently and keeps the order they were added', async () => {
      await addItem(joao, list.id, dark).expect(204);
      await addItem(joao, list.id, heat).expect(204);
      await addItem(joao, list.id, dark).expect(204);

      const items = (await http().get(`/lists/${list.id}/items`).expect(200))
        .body as ItemPage;
      expect(items.data.map((i) => i.title.name)).toEqual(['Dark', 'Heat']);
      expect(items.meta.total).toBe(2);
      const detail = (await http().get(`/lists/${list.id}`)).body as ListBody;
      expect(detail.itemCount).toBe(2);
    });

    it('paginates', async () => {
      await addItem(joao, list.id, dark).expect(204);
      await addItem(joao, list.id, heat).expect(204);

      const page = (
        await http().get(`/lists/${list.id}/items?limit=1&offset=1`)
      ).body as ItemPage;

      expect(page.data.map((i) => i.title.name)).toEqual(['Heat']);
      expect(page.meta.total).toBe(2);
    });

    it('removes idempotently', async () => {
      await addItem(joao, list.id, heat).expect(204);

      await http()
        .delete(`/me/lists/${list.id}/items/${heat}`)
        .set(as(joao))
        .expect(204);
      await http()
        .delete(`/me/lists/${list.id}/items/${heat}`)
        .set(as(joao))
        .expect(204);

      const items = (await http().get(`/lists/${list.id}/items`))
        .body as ItemPage;
      expect(items.meta.total).toBe(0);
    });

    it('only lets the owner change a list', async () => {
      await addItem(maria, list.id, heat).expect(404);
      await http()
        .delete(`/me/lists/${list.id}/items/${heat}`)
        .set(as(maria))
        .expect(404);
      await http()
        .patch(`/me/lists/${list.id}`)
        .set(as(maria))
        .send({ name: 'Hacked' })
        .expect(404);
      await http().delete(`/me/lists/${list.id}`).set(as(maria)).expect(404);

      expect(
        ((await http().get(`/lists/${list.id}`)).body as ListBody).name,
      ).toBe('Mix');
    });

    it('rejects unknown titles, lists and invalid ids', async () => {
      await addItem(joao, list.id, 999).expect(404);
      await addItem(joao, 999, heat).expect(404);
      await http()
        .put(`/me/lists/${list.id}/items/abc`)
        .set(as(joao))
        .expect(400);
    });

    it('drops a title from every list when the title is deleted', async () => {
      await addItem(joao, list.id, heat).expect(204);

      await http().delete(`/movies/${heat}`).set(as(admin)).expect(204);

      expect(
        ((await http().get(`/lists/${list.id}`)).body as ListBody).itemCount,
      ).toBe(0);
    });
  });

  describe('updating and deleting', () => {
    it('renames, describes and clears the description', async () => {
      const list = await createList(joao, { name: 'Old', description: 'text' });
      const patch = (body: object) =>
        http().patch(`/me/lists/${list.id}`).set(as(joao)).send(body);

      expect((await patch({ name: 'New' }).expect(200)).body).toMatchObject({
        name: 'New',
        description: 'text',
      });
      expect((await patch({ description: '' }).expect(200)).body).toMatchObject(
        {
          description: null,
        },
      );
      await patch({ owner: 2 }).expect(400);
    });

    it('rejects a rename to a name already in use', async () => {
      await createList(joao, { name: 'A' });
      const b = await createList(joao, { name: 'B' });

      await http()
        .patch(`/me/lists/${b.id}`)
        .set(as(joao))
        .send({ name: 'A' })
        .expect(409);
    });

    it('deletes a list with its items and with the account', async () => {
      const list = await createList(joao, { name: 'Bye', isPublic: true });
      await addItem(joao, list.id, heat).expect(204);

      await http().delete(`/me/lists/${list.id}`).set(as(joao)).expect(204);
      await http().get(`/lists/${list.id}`).expect(404);

      const other = await createList(maria, { name: 'Mine', isPublic: true });
      const me = (await http().get('/me').set(as(maria))).body as {
        id: number;
      };
      await http().delete(`/users/${me.id}`).set(as(admin)).expect(204);
      await http().get(`/lists/${other.id}`).expect(404);
    });
  });
});
