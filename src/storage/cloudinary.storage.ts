import { BadGatewayException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import {
  SaveImageInput,
  StorageFolder,
  StorageService,
} from './storage.service';

const ROOT_FOLDER = 'movie-catalog';

// Resized on upload so the original is never stored at full size
const TRANSFORMATIONS = {
  avatars: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto' }],
  posters: [{ width: 1000, crop: 'limit' }],
} as const;

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryStorage extends StorageService {
  constructor({ cloudName, apiKey, apiSecret }: CloudinaryCredentials) {
    super();
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  saveImage({ folder, name, buffer }: SaveImageInput): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: this.publicId(folder, name),
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
          transformation: [...TRANSFORMATIONS[folder]],
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadGatewayException('Could not store the image'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  async deleteImage(folder: StorageFolder, name: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(this.publicId(folder, name), {
        invalidate: true,
      });
    } catch {
      throw new BadGatewayException('Could not remove the image');
    }
  }

  private publicId(folder: StorageFolder, name: string): string {
    return `${ROOT_FOLDER}/${folder}/${name}`;
  }
}
