import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  // own registry, so several app instances in one process do not clash
  private readonly registry = new Registry();

  private readonly requests = new Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by method, route and status',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  private readonly duration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  private readonly cache = new Counter({
    name: 'cache_requests_total',
    help: 'Cache lookups by result',
    labelNames: ['result'],
    registers: [this.registry],
  });

  constructor() {
    if (process.env.NODE_ENV !== 'test') {
      collectDefaultMetrics({ register: this.registry });
    }
  }

  observeRequest(
    method: string,
    route: string,
    status: number,
    seconds: number,
  ): void {
    this.requests.inc({ method, route, status });
    this.duration.observe({ method, route }, seconds);
  }

  cacheResult(result: 'hit' | 'miss' | 'error'): void {
    this.cache.inc({ result });
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
