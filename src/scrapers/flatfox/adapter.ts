import type { Logger } from 'pino';
import type { ScraperAdapter, ScrapeOptions, RawRecord } from '../types.js';

/**
 * FlatFox scraper adapter using the public REST API.
 * Paginates through all listings via offset-based pagination.
 * No authentication required. Uses native fetch.
 */
export class FlatfoxAdapter implements ScraperAdapter {
  readonly name = 'flatfox';
  private readonly baseUrl = 'https://flatfox.ch/api/v1/public-listing/';

  constructor(private readonly logger: Logger) {}

  async scrape(options: ScrapeOptions): Promise<RawRecord[]> {
    const allResults: RawRecord[] = [];
    let url: string | null = options.dryRun
      ? `${this.baseUrl}?limit=10&expand=images`
      : `${this.baseUrl}?limit=100&expand=images`;

    while (url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `FlatFox API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as {
        count: number;
        next: string | null;
        results: RawRecord[];
      };
      allResults.push(...data.results);
      this.logger.info(
        { fetched: allResults.length, total: data.count },
        'FlatFox pagination progress',
      );
      url = options.dryRun ? null : data.next;
    }

    return allResults;
  }
}
