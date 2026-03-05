export interface ScrapeOptions {
  dryRun: boolean;
}

export type RawRecord = Record<string, unknown>;

export interface ScraperAdapter {
  readonly name: string;
  scrape(options: ScrapeOptions): Promise<RawRecord[]>;
}
