import { ImageType } from './image';

export type StorageFolder = 'avatars' | 'posters';

export interface SaveImageInput {
  folder: StorageFolder;
  name: string;
  buffer: Buffer;
  type: ImageType;
}

export abstract class StorageService {
  /** Stores the image, replacing any previous one with the same name, and returns its URL. */
  abstract saveImage(input: SaveImageInput): Promise<string>;

  /** Removes the image. Does nothing if it does not exist. */
  abstract deleteImage(folder: StorageFolder, name: string): Promise<void>;
}
