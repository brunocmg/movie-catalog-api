import { Module } from '@nestjs/common';
import { MoviesModule } from 'src/movies/movies.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MoviesModule,
    UsersModule,
    AuthModule,
  ]
})
export class AppModule {}
