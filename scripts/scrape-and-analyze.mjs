// Scheduled job (see .github/workflows/scrape.yml): for each custom source,
// checks robots.txt, fetches the page if allowed, and asks Claude to extract
// any 911 listings found on it. Then backfills AI analysis (vigilance points,
// negotiation arguments, value analysis) for any listing that doesn't have
// one yet — covers both freshly-scraped listings and manually-added ones.
//
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
// The service-role key bypasses RLS — this script is the only place that
// should ever hold it; it must never reach client-side code.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const ANTHROPIC_API_KEY = requireEnv('ANTHROPIC_API_KEY');
const EXTRACTION_MODEL = process.env.SCRAPE_MODEL || 'claude-haiku-4-5';
const USER_AGENT = '911AnalyticsPersonalBot/1.0 (+personal, non-commercial use)';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function generateId() {
  return crypto.randomUUID();
}

// --- robots.txt: minimal but honest check against the exact source URL ---

async function isAllowedByRobotsTxt(targetUrl) {
  const target = new URL(targetUrl);
  const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;

  let robotsText;
  try {
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return { allowed: true, reason: `robots.txt returned ${res.status} — treated as no restrictions` };
    robotsText = await res.text();
  } catch (err) {
    return { allowed: true, reason: `robots.txt unreachable (${err.message}) — treated as no restrictions` };
  }

  // Also refuse outright if the file states a plain-English prohibition,
  // the way leboncoin.fr and willhaben.at do — a courtesy check beyond the
  // strict Disallow syntax, for sites that spell out "no bots" in prose.
  if (/forbidden to use (search )?robots|no.?(automated|automatic) (access|methods)/i.test(robotsText)) {
    return { allowed: false, reason: 'robots.txt explicitly prohibits automated access in its comments' };
  }

  const lines = robotsText.split('\n').map((l) => l.trim());
  let inWildcardBlock = false;
  const disallowPaths = [];
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      inWildcardBlock = value === '*';
    } else if (key === 'disallow' && inWildcardBlock && value) {
      disallowPaths.push(value);
    }
  }

  const blocked = disallowPaths.some((path) => target.pathname.startsWith(path));
  if (blocked) return { allowed: false, reason: `robots.txt Disallow rule blocks ${target.pathname}` };
  return { allowed: true, reason: 'robots.txt permits this path for User-agent: *' };
}

// --- HTML fetch + light cleanup (keep structure/links, drop noise) ---

async function fetchCleanedHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  let html = await res.text();
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/\s{2,}/g, ' ');
  // Keep it within a sane token budget for a cheap extraction model.
  return html.slice(0, 150_000);
}

// --- Claude: extract listings from a page ---

const extractionTool = {
  name: 'report_listings',
  description: 'Report every Porsche 911 listing found on this page.',
  input_schema: {
    type: 'object',
    properties: {
      listings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            generation: {
              type: 'string',
              description: 'One of: Classique, G-Modell, 964, 993, 996, 997, 991, 992',
            },
            phase: { type: 'string', description: 'e.g. "Phase I", omit if unknown' },
            price: { type: 'number' },
            mileage: { type: 'number' },
            year: { type: 'number' },
            power: { type: 'number', description: 'engine power in hp' },
            fuelType: { type: 'string' },
            transmission: { type: 'string' },
            country: {
              type: 'string',
              description:
                'One of: France, Allemagne, Italie, Espagne, Belgique, Pays-Bas, Suisse, Autriche, Portugal, Luxembourg — inferred from the address/phone/language on the page',
            },
            countryFlag: { type: 'string', description: '2-letter ISO code matching country, e.g. FR, DE' },
            city: { type: 'string' },
            seller: { type: 'string' },
            sellerType: { type: 'string', enum: ['Professionnel', 'Particulier'] },
            sellerPhone: { type: 'string' },
            sellerEmail: { type: 'string' },
            listingUrl: { type: 'string', description: 'Absolute URL to this specific ad' },
          },
          required: [
            'model', 'generation', 'price', 'mileage', 'year', 'power', 'fuelType',
            'transmission', 'country', 'countryFlag', 'city', 'seller', 'sellerType', 'listingUrl',
          ],
        },
      },
    },
    required: ['listings'],
  },
};

async function extractListingsFromPage(pageUrl, html) {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    tools: [extractionTool],
    tool_choice: { type: 'tool', name: 'report_listings' },
    messages: [
      {
        role: 'user',
        content:
          `Page URL: ${pageUrl}\n\n` +
          `This is the HTML of a car listings page. Find every Porsche 911 for sale on it ` +
          `and report it via the report_listings tool. Resolve any relative links to absolute ` +
          `URLs using the page URL above. Skip anything that isn't a 911. If a field isn't visible ` +
          `on the page, omit it rather than guessing.\n\n${html}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  return toolUse?.input?.listings ?? [];
}

// --- Claude: generate vigilance points / negotiation args / value analysis ---

const analysisTool = {
  name: 'report_analysis',
  description: "Report an expert-style analysis of this 911 listing for a prospective buyer.",
  input_schema: {
    type: 'object',
    properties: {
      vigilancePoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
            title: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['severity', 'title', 'description'],
        },
      },
      negotiationArguments: { type: 'array', items: { type: 'string' } },
      valueAnalysis: {
        type: 'object',
        properties: {
          retentionScore: { type: 'number', description: '0 to 10' },
          rarityLabel: { type: 'string' },
          trend: { type: 'string', enum: ['up', 'stable', 'down'] },
          trendLabel: { type: 'string' },
          factors: { type: 'array', items: { type: 'string' } },
        },
        required: ['retentionScore', 'rarityLabel', 'trend', 'trendLabel', 'factors'],
      },
    },
    required: ['vigilancePoints', 'negotiationArguments', 'valueAnalysis'],
  },
};

async function analyzeListing(listing) {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 2048,
    tools: [analysisTool],
    tool_choice: { type: 'tool', name: 'report_analysis' },
    system:
      'You are a Porsche 911 buying expert writing for a French-speaking used-car search tool. ' +
      'Write every text field in French. Base your analysis on general, well-known facts about ' +
      "this generation/model's typical issues and the collector market — never invent specific " +
      "facts about this exact car that you can't know (service history, accident record, etc). " +
      'This is a general opinion the buyer should independently verify, not a verified inspection.',
    messages: [
      {
        role: 'user',
        content:
          `Analyze this listing:\n${JSON.stringify(
            {
              model: listing.model,
              generation: listing.generation,
              phase: listing.phase,
              year: listing.year,
              mileage: listing.mileage,
              power: listing.power,
              price: listing.price,
              transmission: listing.transmission,
              fuelType: listing.fuel_type,
            },
            null,
            2
          )}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  return toolUse?.input ?? null;
}

// --- Main ---

async function scrapeCustomSources() {
  const { data: sources, error } = await supabase.from('custom_sources').select('*');
  if (error) throw error;

  for (const source of sources ?? []) {
    console.log(`\n[source] ${source.url}`);
    const { allowed, reason } = await isAllowedByRobotsTxt(source.url);
    console.log(`  robots.txt: ${allowed ? 'allowed' : 'BLOCKED'} — ${reason}`);
    if (!allowed) continue;

    let html;
    try {
      html = await fetchCleanedHtml(source.url);
    } catch (err) {
      console.log(`  fetch failed: ${err.message}`);
      continue;
    }

    let extracted;
    try {
      extracted = await extractListingsFromPage(source.url, html);
    } catch (err) {
      console.log(`  extraction failed: ${err.message}`);
      continue;
    }
    console.log(`  found ${extracted.length} listing(s)`);

    for (const item of extracted) {
      const row = {
        id: generateId(),
        model: item.model,
        generation: item.generation,
        phase: item.phase ?? null,
        image: null,
        price: Math.round(item.price),
        mileage: Math.round(item.mileage),
        year: Math.round(item.year),
        power: Math.round(item.power),
        fuel_type: item.fuelType,
        transmission: item.transmission,
        country: item.country,
        country_flag: item.countryFlag,
        city: item.city,
        seller: item.seller,
        seller_type: item.sellerType,
        seller_rating: null,
        seller_phone: item.sellerPhone ?? null,
        seller_email: item.sellerEmail ?? null,
        listing_url: item.listingUrl,
        listing_source: new URL(source.url).hostname.replace(/^www\./, ''),
        conformity: null,
        last_seen_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('listings')
        .upsert(row, { onConflict: 'listing_url', ignoreDuplicates: false });
      if (upsertError) {
        console.log(`  upsert failed for ${item.listingUrl}: ${upsertError.message}`);
      }
    }
  }
}

async function backfillAnalysis() {
  const { data: unanalyzed, error } = await supabase
    .from('listings')
    .select('*')
    .is('value_analysis', null);
  if (error) throw error;

  console.log(`\n[analysis] ${unanalyzed?.length ?? 0} listing(s) without AI analysis yet`);

  for (const listing of unanalyzed ?? []) {
    try {
      const analysis = await analyzeListing(listing);
      if (!analysis) continue;
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          vigilance_points: analysis.vigilancePoints,
          negotiation_arguments: analysis.negotiationArguments,
          value_analysis: analysis.valueAnalysis,
        })
        .eq('id', listing.id);
      if (updateError) console.log(`  update failed for ${listing.id}: ${updateError.message}`);
      else console.log(`  analyzed ${listing.model} (${listing.id})`);
    } catch (err) {
      console.log(`  analysis failed for ${listing.id}: ${err.message}`);
    }
  }
}

try {
  await scrapeCustomSources();
  await backfillAnalysis();
  console.log('\nDone.');
} catch (err) {
  console.error('\nJob failed:', err.message);
  process.exit(1);
}
