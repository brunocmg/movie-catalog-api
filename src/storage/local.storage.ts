import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { IMAGE_EXTENSIONS } from './image';
import {
  SaveImageInput,
  StorageFolder,
  StorageService,
} from './storage.service';

export class LocalStorage extends StorageService {
  constructor(private readonly root = path.resolve(process.cwd(), 'files')) {
    super();
  }

  async saveImage({
    folder,
    name,
    buffer,
    type,
  }: SaveImageInput): Promise<string> {
    const dir = path.join(this.root, folder);
    await fs.mkdir(dir, { recursive: true });
    await this.deleteImage(folder, name);

    const fileName = `${name}.${IMAGE_EXTENSIONS[type]}`;
    await fs.writeFile(path.join(dir, fileName), buffer);
    return `/files/${folder}/${fileName}`;
  }

  async deleteImage(folder: StorageFolder, name: string): Promise<void> {
    const dir = path.join(this.root, folder);
    const extensions = Object.values(IMAGE_EXTENSIONS);
    await Promise.all(
      extensions.map((ext) =>
        fs.rm(path.join(dir, `${name}.${ext}`), { force: true }),
      ),
    );
  }
}
