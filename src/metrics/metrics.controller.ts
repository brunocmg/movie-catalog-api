import {
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { MetricsService } from './metrics.service';

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

@ApiExcludeController()
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(@Headers('authorization') authorization?: string) {
    // ConfigService may hand back the raw env string
    const enabled = String(this.config.get('METRICS_ENABLED') ?? true);
    if (enabled.trim().toLowerCase() === 'false') {
      throw new NotFoundException();
    }

    const token = this.config.get<string>('METRICS_TOKEN');
    if (token && !safeEqual(authorization ?? '', `Bearer ${token}`)) {
      throw new UnauthorizedException();
    }

    return this.metrics.render();
  }
}
