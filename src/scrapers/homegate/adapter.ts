import { ApifyClient } from 'apify-client';
import type { Logger } from 'pino';
import type { ScraperAdapter, ScrapeOptions, RawRecord } from '../types.js';

/** Default actor ID for our custom Homegate scraper on Apify */
const DEFAULT_ACTOR_ID = 'gusevm1/homegate-scraper';

export class HomegateAdapter implements ScraperAdapter {
  readonly name = 'homegate';
  private readonly actorId: string;

  constructor(
    private readonly client: ApifyClient,
    private readonly logger: Logger,
  ) {
    this.actorId = process.env.HOMEGATE_ACTOR_ID ?? DEFAULT_ACTOR_ID;
  }

  async scrape(options: ScrapeOptions): Promise<RawRecord[]> {
    // Build input for our custom Homegate scraper actor
    // Input schema: { listingType: 'rent' | 'buy' | 'both', maxItems?: number }
    // Per user decisions: residential only, all of Switzerland, both rent and buy
    const input: { listingType: string; maxItems?: number } = {
      listingType: 'both',
      ...(options.dryRun ? { maxItems: 10 } : {}),
    };

    this.logger.info(
      { actor: this.actorId, dryRun: options.dryRun },
      'Starting Homegate scraper actor run',
    );

    const run = await this.client
      .actor(this.actorId)
      .call(input);

    this.logger.info({ runId: run.id, status: run.status }, 'Homegate scraper actor run completed');

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();

    this.logger.info({ itemCount: items.length }, 'Homegate dataset items retrieved');

    return items as RawRecord[];
  }
}
