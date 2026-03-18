## Inspiration

One of our team member's fathers was struggling to find the right house to buy in Switzerland, spending hours scrolling through Flatfox, manually cross-referencing neighborhoods, commute times, and amenities. Many of our friends faced the same pain renting apartments. We realized the Swiss property search process is fundamentally broken: listings are scattered, key information is buried, and comparing properties against personal preferences requires tedious manual research. We set out to fix that with AI.

## What it does

HomeMatch is an AI-powered real estate advisor for the Swiss market. It has three components:

- **Conversational AI onboarding**: A chat interface (powered by Claude Sonnet) guides users through defining their ideal home: budget, location, dealbreakers, and lifestyle priorities. This creates structured preference profiles.
- **Chrome extension**: Injects directly into Flatfox listing pages, showing real-time AI scores (0-100) with color-coded tiers and category breakdowns (location, price, size, amenities, condition). Users see at a glance whether a listing is worth their time.
- **Intelligent scoring engine**: Claude Haiku analyzes each listing against user preferences using vision-based photo analysis, structured data from Flatfox, and live neighborhood data pulled via Apify's Google Places Crawler (nearby amenities, ratings, reviews). This eliminates hours of manual research per listing.

Multi-profile support lets users maintain separate searches (e.g., "downtown apartment for me" vs. "family house for my parents").

## How we built it

We built a multi-layered architecture over 4 focused coding sessions:

- **Backend**: FastAPI on AWS EC2 orchestrates scoring. It fetches listing data from the Flatfox API, scrapes actual displayed prices (the API returns stale data), sends listing images and preferences to Claude Haiku with tool-use capabilities, and invokes Apify's Google Places Crawler as a tool to enrich scoring with real neighborhood context.
- **Frontend**: Next.js web app on Vercel handles auth, profile management, and the conversational onboarding chat. Supabase provides authentication, Postgres with Row Level Security, and edge functions that act as a caching and auth proxy layer.
- **Extension**: Built with WXT (Manifest V3), the Chrome extension injects scoring badges directly into Flatfox pages using Shadow DOM isolation, communicating through the Supabase edge function layer.

## Challenges we ran into

- **Flatfox API unreliability**: We discovered the public API returns stale/incorrect prices. We had to build an HTML scraping layer to extract the actual displayed prices from listing pages.
- **Mixed content blocking**: The HTTPS web app couldn't call our HTTP backend directly. We solved this with a Next.js API proxy route.
- **Making three independent systems work together**: The Chrome extension, web app, and backend each work independently, but orchestrating auth, caching, and real-time scoring across all three was the hardest integration challenge.

## Accomplishments we're proud of

- **Real-world validation**: We connected with [Vera Lee Caflisch](https://www.linkedin.com/in/vera-lee-caflisch-2a5920201/), a real estate agent with 7 years of experience, who piloted HomeMatch with her junior agent. In early testing, they reported a **40% increase in relevant properties identified** in the first day. This is based on a small sample size and we are actively collecting more data to validate this further. We are in discussions to pilot with Bellevia Immobilien in the coming days.
- **Production-ready system**: This isn't a demo. It's a live, fully hosted product with auth, caching, multi-profile support, and a real Chrome extension.
- **Apify-powered neighborhood intelligence**: By integrating the Google Places Crawler as a Claude tool-use action, our scoring engine autonomously researches nearby amenities, transit, and services, exactly what a human would do manually.

## What we learned

- That LLM tool-use (Claude calling Apify mid-scoring) creates a fundamentally better UX than pre-fetching all data. The AI decides what context it needs.
- That real users (like Vera) care most about reducing time-to-decision, not just accuracy.
- That building for a real market (Swiss real estate) forces you to handle messy, unreliable data sources, and that's where the real value is.

## What's next

- Cost optimization of AI calls for scaling beyond beta
- Expanding beyond Flatfox to other Swiss platforms (Homegate, ImmoScout24)
- Deeper Apify integration: commute time analysis, school ratings, crime data
- Formal pilot with Bellevia Immobilien and data collection for scoring accuracy benchmarks
