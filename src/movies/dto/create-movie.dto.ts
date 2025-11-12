import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly genre?: string;

  @IsOptional()
  @IsString()
  readonly director?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1888)
  readonly year: number;
}
