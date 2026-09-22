// Supabase Edge Function: given a listing URL and/or user-pasted text,
// extracts structured 911 listing fields via Claude. Runs server-side so
// the Anthropic API key is never exposed to the browser, and so the page
// fetch (subject to CORS on the target site anyway) happens from a server.
//
// Requires an authenticated Supabase session (checked below) — this is
// not a public endpoint, both to control cost and because it's meant for
// the app owner only.
//
// Env vars (set via `supabase secrets set`): ANTHROPIC_API_KEY.
// SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically by the
// Supabase Edge Functions runtime.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const MODEL = 'claude-haiku-4-5';
const USER_AGENT = '911AnalyticsPersonalBot/1.0 (+personal, non-commercial use)';

// Same policy as scripts/scrape-and-analyze.mjs — see the comment there for why
// named AI-crawler blocks are honored even under our own declared User-Agent.
const AI_CRAWLER_TOKENS = [
  'claudebot', 'anthropic-ai', 'gptbot', 'chatgpt-user', 'ccbot',
  'google-extended', 'applebot-extended', 'omgilibot', 'diffbot', 'bytespider',
];

interface RobotsBlock {
  agents: string[];
  disallow: string[];
}

function parseRobotsBlocks(text: string): RobotsBlock[] {
  const blocks: RobotsBlock[] = [];
  let agents: string[] = [];
  let disallow: string[] = [];
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

function isPathBlocked(blocks: RobotsBlock[], path: string): boolean {
  return blocks.some((block) => {
    const appliesToUs = block.agents.some((a) => a === '*' || AI_CRAWLER_TOKENS.includes(a));
    return appliesToUs && block.disallow.some((d) => path.startsWith(d));
  });
}

async function checkRobotsTxt(targetUrl: string): Promise<{ allowed: boolean; reason: string }> {
  const target = new URL(targetUrl);
  const robotsUrl = `${target.protocol}//${target.host}/robots.txt`;

  let robotsText: string;
  try {
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return { allowed: true, reason: `robots.txt returned ${res.status} — treated as no restrictions` };
    robotsText = await res.text();
  } catch (err) {
    return { allowed: true, reason: `robots.txt unreachable (${(err as Error).message}) — treated as no restrictions` };
  }

  if (/forbidden to use (search )?robots|no.?(automated|automatic) (access|methods)/i.test(robotsText)) {
    return { allowed: false, reason: 'robots.txt explicitly prohibits automated access in its comments' };
  }

  const blocks = parseRobotsBlocks(robotsText);
  if (isPathBlocked(blocks, target.pathname)) {
    return { allowed: false, reason: `robots.txt Disallow rule blocks ${target.pathname} (for "*" or a named AI crawler)` };
  }
  return { allowed: true, reason: 'robots.txt permits this path' };
}

const extractionTool = {
  name: 'report_listing',
  description: 'Report whatever details of this single Porsche 911 listing could be found.',
  input_schema: {
    type: 'object' as const,
    properties: {
      model: {
        type: 'string',
        description: 'Model/trim name only, e.g. "911 Carrera S" — not the full listing title. Model names ' +
          "are the same across languages, keep as-is; don't include condition/marketing text from the title.",
      },
      generation: { type: 'string', description: 'One of: Classique, G-Modell, 964, 993, 996, 997, 991, 992' },
      phase: { type: 'string', description: 'e.g. "Phase I" — translate to French if stated in another language, omit if unknown' },
      imageUrl: {
        type: 'string',
        description:
          'Direct URL of the main listing photo, if one is visible in the page (e.g. an og:image meta tag or the first gallery image). Must be an absolute, publicly reachable image URL.',
      },
      price: { type: 'number' },
      mileage: { type: 'number' },
      year: { type: 'number' },
      power: { type: 'number', description: 'engine power in hp' },
      fuelType: {
        type: 'string',
        enum: ['Essence', 'Hybride', 'Électrique'],
        description: 'Normalize to this exact French value, translating from whatever language the source uses (e.g. "Benzina"/"Petrol" → Essence).',
      },
      transmission: {
        type: 'string',
        enum: ['Manuelle', 'Automatique / PDK'],
        description: 'Normalize to this exact French value, translating from whatever language the source uses (e.g. "Manuale"/"Manual" → Manuelle).',
      },
      country: {
        type: 'string',
        description: 'One of: France, Allemagne, Italie, Espagne, Belgique, Pays-Bas, Suisse, Autriche, Portugal, Luxembourg',
      },
      countryFlag: { type: 'string', description: '2-letter ISO code matching country' },
      city: { type: 'string' },
      seller: { type: 'string' },
      sellerType: { type: 'string', enum: ['Professionnel', 'Particulier'] },
      sellerPhone: { type: 'string' },
      sellerEmail: { type: 'string' },
      listingSource: { type: 'string', description: 'e.g. "mobile.de", "AutoScout24"' },
      options: {
        type: 'array',
        description:
          'Value-adding factory options explicitly mentioned in the listing text (any language). Only include a code if that option is clearly stated as present — never guess.',
        items: {
          type: 'string',
          enum: [
            'x51', 'pse', 'sportSeats', 'sportChrono', 'carbonBrakes',
            'pasm', 'sportSuspension', 'pdcc', 'lsd', 'rearSteering', 'matrixLed',
            'bose', 'axleLift', 'pts', 'carbonTrim', 'fullLeather', 'sunroof', 'carPlay',
          ],
        },
      },
      sellerDescriptionExcerpt: {
        type: 'string',
        description:
          "Verbatim or near-verbatim excerpt (up to ~1500 characters) of the seller's own free-text " +
          'description of the car — condition, history, ownership claims, equipment. Keep the original ' +
          "language. Never summarize or add anything the seller didn't say; omit if there's no free text.",
      },
      porscheApproved: {
        type: 'boolean',
        description:
          'True only if the listing explicitly states this car is certified under the official "Porsche ' +
          'Approved" pre-owned program (or local equivalent, e.g. "Porsche Approved", "occasion certifiée ' +
          'Porsche"). Omit entirely if not mentioned — never guess or infer from dealer type alone.',
      },
    },
    required: [],
  },
};

// Maps each option code to the terms that indicate it in listing text, so
// the model above has something concrete to match against.
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Non authentifié.' }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: 'Non authentifié.' }, 401);

  let body: { url?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Requête invalide.' }, 400);
  }

  const url = body.url?.trim();
  const notes = body.notes?.trim();
  if (!url && !notes) return jsonResponse({ error: "Rien à analyser — fournis une URL ou du texte." }, 400);

  let pageText = '';
  let urlFetched = false;
  let urlBlockedReason: string | null = null;

  if (url) {
    try {
      const robotsCheck = await checkRobotsTxt(url);
      if (!robotsCheck.allowed) {
        urlBlockedReason = robotsCheck.reason;
      } else {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (res.ok) {
          let html = await res.text();
          html = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\s{2,}/g, ' ');
          pageText = html.slice(0, 150_000);
          urlFetched = true;
        } else {
          urlBlockedReason = `HTTP ${res.status}`;
        }
      }
    } catch (err) {
      urlBlockedReason = `Requête impossible (${(err as Error).message})`;
    }
  }

  if (!pageText && !notes) {
    return jsonResponse({ urlFetched: false, urlBlockedReason });
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const parts: string[] = [];
  if (pageText) parts.push(`HTML de la page (URL d'origine : ${url}) :\n${pageText}`);
  if (notes) parts.push(`Texte collé par l'utilisateur depuis l'annonce :\n${notes}`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [extractionTool],
    tool_choice: { type: 'tool', name: 'report_listing' },
    messages: [
      {
        role: 'user',
        content:
          "Extrait les informations de cette annonce Porsche 911 via l'outil report_listing. " +
          "N'invente jamais une valeur qui n'est pas visible dans le texte ci-dessous — omets " +
          "simplement le champ si l'information n'y figure pas. Pour le champ options, base-toi " +
          `sur ce lexique : ${OPTIONS_HINT}\n\n` +
          "La page source peut être dans n'importe quelle langue (italien, allemand, anglais...). " +
          "Traduis systématiquement en français tout champ descriptif (model, phase, et tout texte " +
          "libre autre que sellerDescriptionExcerpt) — ne laisse jamais passer une valeur dans la " +
          "langue d'origine. Les identifiants restent tels quels : ville, nom du vendeur, téléphone, " +
          "email, URL. sellerDescriptionExcerpt seul reste dans sa langue d'origine (verbatim).\n\n" +
          parts.join('\n\n'),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use') as
    | { input: Record<string, unknown> }
    | undefined;

  return jsonResponse({ ...(toolUse?.input ?? {}), urlFetched, urlBlockedReason });
});
