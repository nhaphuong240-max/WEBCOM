import { Injectable } from '@nestjs/common';
import { AppError } from '@ptt/shared-kernel';
import { fetchGhnQuotes, stubQuotes, type ShippingQuote } from './shipping.adapters';

@Injectable()
export class ShippingService {
  private liveEnabled() {
    const v = process.env.FEATURE_LIVE_SHIPPING;
    if (v === undefined || v === '') return false;
    return v === '1' || v.toLowerCase() === 'true';
  }

  async quotes(city?: string): Promise<ShippingQuote[]> {
    if (this.liveEnabled()) {
      const live = await fetchGhnQuotes(city);
      if (live?.length) return live;
    }
    return stubQuotes(city);
  }

  async quoteAmount(city: string | undefined, carrier: string): Promise<{
    carrier: string;
    service: string;
    amount: number;
    source: 'live' | 'stub';
  }> {
    const list = await this.quotes(city);
    const hit = list.find((q) => q.carrier.toUpperCase() === carrier.toUpperCase()) || list[0];
    if (!hit) throw AppError.validation('No shipping quote available');
    return {
      carrier: hit.carrier,
      service: hit.service,
      amount: Number(hit.amount),
      source: hit.source,
    };
  }
}
