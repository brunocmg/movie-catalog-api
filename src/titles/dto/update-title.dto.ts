import { PartialType } from '@nestjs/swagger';
import { CreateTitleDto } from './create-title.dto';

export class UpdateTitleDto extends PartialType(CreateTitleDto) {}
