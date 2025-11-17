import { Module } from '@nestjs/common';
import { MoviesModule } from 'src/movies/movies.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MoviesModule,
    UsersModule
  ]
})
export class AppModule {}
