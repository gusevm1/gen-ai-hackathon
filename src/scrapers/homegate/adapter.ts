import { ApifyClient } from 'apify-client';
import type { Logger } from 'pino';
import type { ScraperAdapter, ScrapeOptions, RawRecord } from '../types.js';

export class HomegateAdapter implements ScraperAdapter {
  readonly name = 'homegate';

  constructor(
    private readonly client: ApifyClient,
    private readonly logger: Logger,
  ) {}

  async scrape(options: ScrapeOptions): Promise<RawRecord[]> {
    // Build input for Apify actor
    // Actor: 'ecomscrape/homegate-property-search-scraper'
    // Input takes search page URLs with pre-applied filters
    // Per user decisions: residential only (apartments + houses), all of Switzerland, both rent and buy
    const input = {
      urls: [
        { url: 'https://www.homegate.ch/rent/real-estate/switzerland/matching-list' },
        { url: 'https://www.homegate.ch/buy/real-estate/switzerland/matching-list' },
      ],
      ...(options.dryRun ? { maxItems: 10 } : {}),
    };

    this.logger.info(
      { actor: 'ecomscrape/homegate-property-search-scraper', dryRun: options.dryRun },
      'Starting Apify actor run',
    );

    const run = await this.client
      .actor('ecomscrape/homegate-property-search-scraper')
      .call(input);

    this.logger.info({ runId: run.id, status: run.status }, 'Apify actor run completed');

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();

    this.logger.info({ itemCount: items.length }, 'Dataset items retrieved');

    return items as RawRecord[];
  }
}
