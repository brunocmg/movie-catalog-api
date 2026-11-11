import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorage } from './cloudinary.storage';
import { LocalStorage } from './local.storage';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService => {
        const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = config.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');

        return cloudName && apiKey && apiSecret
          ? new CloudinaryStorage({ cloudName, apiKey, apiSecret })
          : new LocalStorage();
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
