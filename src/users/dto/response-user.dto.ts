export class ResponseUserDto {
  id: number;
  name: string;
  email: string;
  watchedMovies: string[];
}

export class ResponseUpdateAvatarDto {
  id: number;
  name: string;
  email: string;
  watchedMovies: string[];
  avatar: string | null;
}
