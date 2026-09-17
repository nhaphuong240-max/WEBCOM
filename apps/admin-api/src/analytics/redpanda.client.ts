import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ChStorefrontEvent } from './clickhouse.client';
import { ClickHouseClient } from './clickhouse.client';

function featureRp() {
  const v = process.env.FEATURE_REDPANDA;
  if (v === undefined || v === '') return true;
  return v === '1' || v.toLowerCase() === 'true';
}

type BusMessage = { topic: string; value: ChStorefrontEvent; at: number };

/**
 * Redpanda / Kafka-compatible event bus.
 * Default: in-process topic + consumer → ClickHouse (pipeline without brokers).
 * Live: when REDPANDA_BROKERS set, also POSTs JSON lines to optional HTTP proxy
 * (REDPANDA_HTTP_PROXY) for external consume; in-process consumer still sinks to CH.
 */
@Injectable()
export class RedpandaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedpandaClient.name);
  private readonly queue: BusMessage[] = [];
  private mode: 'live' | 'stub' = 'stub';
  private ready = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private produced = 0;
  private consumed = 0;
  private failed = 0;

  constructor(private readonly ch: ClickHouseClient) {}

  onModuleInit() {
    if (!featureRp()) {
      this.ready = false;
      return;
    }
    this.mode = process.env.REDPANDA_BROKERS || process.env.REDPANDA_HTTP_PROXY ? 'live' : 'stub';
    this.ready = true;
    this.timer = setInterval(() => void this.drain(), 50);
    // Don't keep process alive solely for the drain loop in tests
    if (typeof this.timer.unref === 'function') this.timer.unref();
    this.log.log(`Redpanda bus mode=${this.mode} topic=${this.topic()}`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  status() {
    return {
      enabled: featureRp(),
      ready: this.ready,
      mode: this.mode,
      topic: this.topic(),
      queued: this.queue.length,
      produced: this.produced,
      consumed: this.consumed,
      failed: this.failed,
      brokers: process.env.REDPANDA_BROKERS ? '[set]' : null,
    };
  }

  private topic() {
    return process.env.REDPANDA_TOPIC_EVENTS || 'webcom.storefront.events';
  }

  async produce(event: ChStorefrontEvent) {
    if (!this.ready) return { ok: false, mode: 'off' as const };
    this.queue.push({ topic: this.topic(), value: event, at: Date.now() });
    this.produced += 1;

    const proxy = process.env.REDPANDA_HTTP_PROXY?.trim();
    if (proxy) {
      try {
        await fetch(`${proxy.replace(/\/$/, '')}/topics/${encodeURIComponent(this.topic())}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.kafka.json.v2+json' },
          body: JSON.stringify({ records: [{ value: event }] }),
          signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
        });
      } catch (e) {
        this.log.warn(`Redpanda HTTP proxy produce soft-fail: ${e}`);
      }
    }
    return { ok: true, mode: this.mode };
  }

  /** Flush pending messages into ClickHouse (also called by interval). */
  async drain() {
    while (this.queue.length) {
      const msg = this.queue.shift()!;
      try {
        await this.ch.insert(msg.value);
        this.consumed += 1;
      } catch {
        this.failed += 1;
        this.queue.unshift(msg);
        break;
      }
    }
  }

  /** Test helper: wait until queue drained (or timeout). */
  async flush(timeoutMs = 2000) {
    const start = Date.now();
    while (this.queue.length && Date.now() - start < timeoutMs) {
      await this.drain();
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}
