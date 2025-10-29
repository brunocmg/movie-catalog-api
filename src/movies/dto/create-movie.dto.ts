export class CreateMovieDto {
  readonly name: string;
  readonly genre?: string;
  readonly director?: string;
  readonly year: number;
}
