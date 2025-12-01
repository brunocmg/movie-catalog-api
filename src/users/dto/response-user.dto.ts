export class ResponseUserDto {
  id: number;
  name: string;
  email: string;
}

export class ResponseUpdateAvatarDto {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}