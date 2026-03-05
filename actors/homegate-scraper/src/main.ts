import { Actor } from 'apify';
import { CheerioCrawler, log } from 'crawlee';

import type { ActorInput } from './types.js';
import { createRequestHandler } from './routes.js';

/**
 * Homegate Property Scraper - Apify Actor
 *
 * Scrapes Homegate property listings using CheerioCrawler.
 * Extracts structured JSON data from window.__INITIAL_STATE__ script tags
 * (not CSS selectors), paginates through search results, and pushes
 * normalized listing data to the Apify Dataset.
 */

try {
  await Actor.init();

  const input = await Actor.getInput<ActorInput>();
  const listingType = input?.listingType ?? 'both';
  const maxItems = input?.maxItems ?? 0;

  log.info(`Starting Homegate scraper: listingType=${listingType}, maxItems=${maxItems || 'unlimited'}`);

  // Create proxy configuration (let Apify decide the proxy group for optimal cost)
  const proxyConfiguration = await Actor.createProxyConfiguration();

  // Shared reference so the request handler can enqueue pagination pages
  const crawlerRef: { crawler: CheerioCrawler | null } = { crawler: null };

  const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxConcurrency: 5,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
    requestHandler: createRequestHandler(maxItems, crawlerRef),
  });

  // Set the crawler reference so the handler can call addRequests
  crawlerRef.crawler = crawler;

  // Build start URLs based on listing type
  const startUrls: string[] = [];
  if (listingType === 'rent' || listingType === 'both') {
    startUrls.push('https://www.homegate.ch/rent/real-estate/switzerland/matching-list');
  }
  if (listingType === 'buy' || listingType === 'both') {
    startUrls.push('https://www.homegate.ch/buy/real-estate/switzerland/matching-list');
  }

  log.info(`Starting crawl with ${startUrls.length} start URL(s)`);

  await crawler.run(startUrls);

  log.info('Crawl complete');
  await Actor.exit();
} catch (error) {
  log.error('Actor failed:', { error: error instanceof Error ? error.message : error });
  await Actor.exit({ statusMessage: 'Actor failed', exitCode: 1 });
}
