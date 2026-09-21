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

// Kept in sync with src/data.ts's allOptions — this script has no access to
// the frontend's module graph, so the option catalog is duplicated here.
const OPTION_LABELS = {
  x51: 'X51 Powerkit',
  pse: 'Échappement Sport PSE',
  sportSeats: 'Sièges Sport Plus adaptatifs (18 pos.)',
  sportChrono: 'Pack Sport Chrono',
  carbonBrakes: 'Freins Carbone PCCB',
  pasm: 'Suspension pilotée PASM',
  sportSuspension: 'Suspension sport abaissée (-20 mm)',
  pdcc: 'Stabilisation active PDCC',
  lsd: 'Différentiel à glissement limité',
  rearSteering: 'Essieu arrière directeur',
  matrixLed: 'Phares LED Matrix (PDLS+)',
  bose: 'Système audio haut de gamme',
  axleLift: "Levage de l'essieu avant",
  pts: 'Peinture spéciale / Paint to Sample',
  carbonTrim: 'Pack carbone (intérieur/extérieur)',
  fullLeather: 'Sellerie cuir intégrale',
  sunroof: 'Toit ouvrant / panoramique',
  carPlay: 'Apple CarPlay / Android Auto',
};
// Buying-priority tier, kept in sync with src/data.ts's allOptions — used to
// weight the negotiation/value-factor prompt below.
const OPTION_TIERS = {
  sportChrono: 'high', pse: 'high', rearSteering: 'high', pasm: 'high',
  sportSuspension: 'high', axleLift: 'high', carbonBrakes: 'high', lsd: 'high', pdcc: 'high',
  sportSeats: 'notable', fullLeather: 'notable', bose: 'notable', sunroof: 'notable',
  matrixLed: 'notable', pts: 'notable', x51: 'notable', carPlay: 'notable',
  carbonTrim: 'appeal',
};
const OPTIONS_HINT =
  'x51=X51 Powerkit (964 power upgrade); pse=Porsche Sport Exhaust/échappement sport; ' +
  'sportSeats=sport seats/sièges sport; ' +
  'sportChrono=Sport Chrono Package/Pack Sport Chrono; carbonBrakes=PCCB/ceramic brakes/freins carbone; ' +
  'pasm=PASM/adaptive suspension/suspension pilotée; pdcc=PDCC/active roll stabilization; ' +
  'lsd=limited-slip differential/différentiel autobloquant/Sperrdifferential; ' +
  'rearSteering=rear-axle steering/essieu arrière directeur/Hinterachslenkung; ' +
  'matrixLed=Matrix LED headlights/PDLS+/phares LED Matrix; bose=Bose/Burmester/premium sound system; ' +
  'axleLift=front axle lift/levage essieu avant/Liftsystem; pts=Paint to Sample/peinture spéciale; ' +
  'carbonTrim=carbon trim package/pack carbone; fullLeather=full leather/sellerie cuir intégrale; ' +
  'sportSuspension=lowered sport suspension -20mm (static, distinct from adaptive PASM)/suspension sport abaissée; ' +
  'sunroof=sunroof/panoramic roof/toit ouvrant/toit panoramique/Schiebedach; ' +
  'carPlay=Apple CarPlay/Android Auto/smartphone integration.';

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
//
// Beyond the generic "User-agent: *" block, this also honors any block
// aimed at AI/LLM crawlers by name (ClaudeBot, GPTBot, CCBot, ...) even
// though our own declared User-Agent string differs — sites like
// AutoScout24 exclude those crawlers by name specifically, and the point
// of that exclusion is clearly "no AI-affiliated tools", not "unless you
// pick a different name". Respecting the letter of robots.txt while
// routing around its evident intent isn't a distinction worth making.

const AI_CRAWLER_TOKENS = [
  'claudebot', 'anthropic-ai', 'gptbot', 'chatgpt-user', 'ccbot',
  'google-extended', 'applebot-extended', 'omgilibot', 'diffbot', 'bytespider',
];

function parseRobotsBlocks(text) {
  const blocks = [];
  let agents = [];
  let disallow = [];
  let sawDirective = false;

  const flush = () => {
    if (agents.length) blocks.push({ agents, disallow });
    agents = [];
    disallow = [];
    sawDirective = false;
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (sawDirective) flush();
      agents.push(value.toLowerCase());
    } else if (key === 'disallow') {
      sawDirective = true;
      if (value) disallow.push(value);
    } else if (key === 'allow') {
      sawDirective = true;
    }
  }
  flush();
  return blocks;
}

function isPathBlocked(blocks, path) {
  return blocks.some((block) => {
    const appliesToUs = block.agents.some((a) => a === '*' || AI_CRAWLER_TOKENS.includes(a));
    return appliesToUs && block.disallow.some((d) => path.startsWith(d));
  });
}

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

  const blocks = parseRobotsBlocks(robotsText);
  if (isPathBlocked(blocks, target.pathname)) {
    return { allowed: false, reason: `robots.txt Disallow rule blocks ${target.pathname} (for "*" or a named AI crawler)` };
  }
  return { allowed: true, reason: 'robots.txt permits this path' };
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
            options: {
              type: 'array',
              description:
                'Value-adding factory options explicitly mentioned for this listing. Only include a code if clearly stated as present — never guess.',
              items: {
                type: 'string',
                enum: Object.keys(OPTION_LABELS),
              },
            },
            sellerDescriptionExcerpt: {
              type: 'string',
              description:
                "Verbatim or near-verbatim excerpt (up to ~1500 characters) of this listing's own free-text " +
                "description — condition, history, ownership claims. Keep the original language. Never invent " +
                "anything the seller didn't say; omit if there's no free text for this listing.",
            },
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
          `on the page, omit it rather than guessing. For the options field, use this lexicon: ` +
          `${OPTIONS_HINT}\n\n${html}`,
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

// Feeds the option priority tiers into the analysis prompt so the AI weighs
// missing/present options consistently with the app's own buying-priority
// catalog rather than an unweighted list.
const OPTIONS_PRIORITY_GUIDE =
  'When weighing options for value/negotiation, use this buying-priority tiering (high > notable > appeal): ' +
  Object.entries(OPTION_TIERS)
    .map(([key, tier]) => `${OPTION_LABELS[key] ?? key} (${tier})`)
    .join(', ') +
  '. A missing "high" tier option is a real negotiation lever (state it plainly, e.g. "no Sport Chrono — ' +
  'hard to retrofit, use it to negotiate"); present "high" tier options are genuine value/retention factors. ' +
  '"notable" and "appeal" options matter less and vary more by buyer taste — mention them only if relevant.';

// Grounded in specialist Porsche buying-guide consensus (Rennlist, Total911,
// stuttcars, elferspot) — categories worth scanning the seller's own text
// for, without ever asserting something as fact the text doesn't support.
const SUSPICIOUS_SIGNALS_GUIDE =
  'Separately, scan the seller description (if provided) and the structured fields for language suggesting ' +
  'any of these known risk categories, and raise a vigilance point (severity "warning" or "critical" depending ' +
  'on how explicit the signal is) when you find one — phrase it as "à vérifier"/"signal détecté", never as a ' +
  'confirmed fact you cannot know: ' +
  '(1) Grey/non-EU import — US-spec markers (mph speedometer, federal bumpers, "US import", title in another ' +
  'country) mean the buyer may inherit unpaid import VAT/customs duties and compliance (COC certificate) issues ' +
  'if the car was never properly registered in the EU; (2) Accident/damage history — words like accidenté, ' +
  'sinistré, choc, repeint, Unfall, "light damage", even when downplayed; (3) Title/registration irregularities — ' +
  'salvage title, "véhicule gravement endommagé" (VGE), Schadenwagen, carte grise non conforme, "non dédouané"; ' +
  '(4) Odometer/service-history inconsistency — mileage that looks low for the age with no service record ' +
  'mentioned, missing books/history, "kilométrage non garanti". Do not raise a point for a category with no ' +
  'textual support — silence on a topic is not itself a red flag.';

async function analyzeListing(listing) {
  const presentOptions = (listing.options ?? [])
    .filter((o) => o.present)
    .map((o) => o.label);

  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 2048,
    tools: [analysisTool],
    tool_choice: { type: 'tool', name: 'report_analysis' },
    system:
      'You are a Porsche 911 buying expert writing for a French-speaking used-car search tool. ' +
      'Write every text field in French. Base your analysis on general, well-known facts about ' +
      "this generation/model's typical issues and the collector market — never invent specific " +
      "facts about this exact car that you can't know (service history, accident record, etc), " +
      'except where explicitly grounded in the seller description text as described below. ' +
      'This is a general opinion the buyer should independently verify, not a verified inspection.\n\n' +
      `${OPTIONS_PRIORITY_GUIDE}\n\n${SUSPICIOUS_SIGNALS_GUIDE}`,
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
              presentOptions,
              sellerDescription: listing.seller_description ?? null,
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
        options: (item.options ?? [])
          .filter((key) => key in OPTION_LABELS)
          .map((key) => ({ key, label: OPTION_LABELS[key], present: true })),
        seller_description: item.sellerDescriptionExcerpt ?? null,
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
