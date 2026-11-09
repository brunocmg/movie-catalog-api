import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MAX_INT4 = 2_147_483_647;

// ParseIntPipe accepts values beyond int4, which then fail in the driver
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('id must be a positive integer');
    }

    const id = Number(value);
    if (id < 1 || id > MAX_INT4) {
      throw new BadRequestException('id is out of range');
    }

    return id;
  }
}
