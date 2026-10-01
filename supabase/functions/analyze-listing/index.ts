// Supabase Edge Function: generates the expert-style analysis (vigilance
// points, negotiation arguments, value trend, AI-estimated fair price) for
// ONE listing. Called automatically right after a listing is added or
// edited from the frontend (AddListingDrawer), and also available as a
// manual "Réanalyser" action from the detail panel — so a listing's
// analysis is never more than one save away from being fresh, without
// needing the separate GitHub Actions batch job.
//
// Requires an authenticated Supabase session (checked below).
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

// Kept in sync with src/data.ts's allOptions and scripts/scrape-and-analyze.mjs's
// OPTION_LABELS/OPTION_TIERS — this function has no access to the frontend's
// module graph, so the catalog is duplicated here.
const OPTION_LABELS: Record<string, string> = {
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
const OPTION_TIERS: Record<string, string> = {
  sportChrono: 'high', pse: 'high', rearSteering: 'high', pasm: 'high',
  sportSuspension: 'high', axleLift: 'high', lsd: 'high', pdcc: 'high',
  sportSeats: 'notable', fullLeather: 'notable', bose: 'notable', sunroof: 'notable',
  matrixLed: 'notable', pts: 'notable', x51: 'notable', carPlay: 'notable', carbonBrakes: 'notable',
  carbonTrim: 'appeal',
};

const OPTIONS_PRIORITY_GUIDE =
  'When weighing options for value/negotiation, use this buying-priority tiering (high > notable > appeal): ' +
  Object.entries(OPTION_TIERS)
    .map(([key, tier]) => `${OPTION_LABELS[key] ?? key} (${tier})`)
    .join(', ') +
  '. A missing "high" tier option is a real negotiation lever (state it plainly, e.g. "no Sport Chrono — ' +
  'hard to retrofit, use it to negotiate"); present "high" tier options are genuine value/retention factors. ' +
  '"notable" and "appeal" options matter less and vary more by buyer taste — mention them only if relevant.';

const SUSPICIOUS_SIGNALS_911_GUIDE =
  'When modelFamily is "911": separately, scan the seller description (if provided) and the structured fields ' +
  'for language suggesting any of these known risk categories, and raise a vigilance point (severity "warning" ' +
  'or "critical" depending on how explicit the signal is) when you find one — phrase it as "à vérifier"/"signal ' +
  'détecté", never as a confirmed fact you cannot know: ' +
  '(1) Grey/non-EU import — US-spec markers (mph speedometer, federal bumpers, "US import", title in another ' +
  'country) mean the buyer may inherit unpaid import VAT/customs duties and compliance (COC certificate) issues ' +
  'if the car was never properly registered in the EU; (2) Accident/damage history — words like accidenté, ' +
  'sinistré, choc, repeint, Unfall, "light damage", even when downplayed; (3) Title/registration irregularities — ' +
  'salvage title, "véhicule gravement endommagé" (VGE), Schadenwagen, carte grise non conforme, "non dédouané"; ' +
  '(4) Odometer/service-history inconsistency — mileage that looks low for the age with no service record ' +
  'mentioned, missing books/history, "kilométrage non garanti". Do not raise a point for a category with no ' +
  'textual support — silence on a topic is not itself a red flag.';

// Grounded in Macan-specific buying-guide/forum consensus (Rennlist, Macan
// Forum, stuttcars) — the 964/996/997-era issues above (cylinder scoring,
// IMS bearing) simply don't apply to this car; these are its own real,
// well-documented failure points, concentrated in the 95B.1 pre-facelift era.
const SUSPICIOUS_SIGNALS_MACAN_GUIDE =
  'When modelFamily is "Macan": scan the seller description and structured fields for signals matching these ' +
  'known Macan risk categories, same severity rules as above (never assert as confirmed fact, only "à ' +
  'vérifier"/signal détecté" when the text supports it): ' +
  '(1) Transfer case failure — well-documented on 2015-2018 (95B.1) cars: jerky shifting, hesitation. Porsche ' +
  'extended the warranty on this part — ask whether it was replaced under that extension. ' +
  '(2) Timing chain tensioner failure — affects the 3.0L/3.6L V6 turbo engines (shared architecture with the ' +
  'Audi/VW EA839 family), especially 2015-2016 cars and any history of extended oil-change intervals or low ' +
  'oil level; symptom is chain rattle on cold start; repair is costly (chain, tensioner, guides). ' +
  '(3) Coolant pipe leaks — plastic-to-aluminum coolant pipe joints beneath the intake manifold go brittle from ' +
  'heat cycling and crack, especially past ~100,000 km; ask about coolant top-ups or overheating history. ' +
  '(4) PDK low-speed judder on early (2014-2016) cars — Porsche issued a software fix, some needed a ' +
  'mechatronic unit replacement; ask if a PDK software update was done. ' +
  '(5) Air suspension (if the airSuspension option is present) — compressor/valve faults can appear from as ' +
  'little as 40,000-60,000 km, causing uneven ride height; a real inspection point, not just a comfort option. ' +
  '(6) Elevated brake pad/rotor wear at relatively low mileage is normal for this car (heavy, sporty) and not ' +
  'itself a red flag — only raise it as a negotiation point if photos or the text indicate pads/discs near end ' +
  'of life. (7) Some V6 engines consume oil faster than typical — ask about oil top-ups between services. ' +
  '(8) Infotainment/PCM freezing or slow response is more common pre-2019 (95B.1), largely resolved by the ' +
  '2019 facelift\'s new touchscreen system — don\'t penalize a post-2019 car for this unless stated. ' +
  '(9) For the Macan Electric (2024+, generation "Électrique (2024+)"): this is a different car on a different ' +
  'platform — none of the ICE issues above apply. Instead: ask about battery state of health/degradation if ' +
  'disclosed and charging history; note that Porsche recalled 2024-2025 model-year Macan Electric units over a ' +
  'backup camera that may stay dark or show a blurry image in reverse — ask whether that recall was performed.';

// Frames retentionScore/rarityLabel/estimatedFairPrice reasoning differently
// per model line — a 911 is reasoned about as a sports-car/collector asset,
// but applying that same collector-market language to a mainstream SUV like
// the Macan would be actively misleading (most Macans depreciate like any
// used premium SUV; "rarity" there means desirable spec, not scarcity).
const FAMILY_CONTEXT_GUIDE =
  'Model-family context for retentionScore, rarityLabel and estimatedFairPrice: ' +
  'When modelFamily is "911", reason as you would about a sports-car/collector asset — rarity, generation ' +
  'desirability and appreciation potential are real, central factors (as covered elsewhere in these ' +
  'instructions). When modelFamily is "Macan", reason instead as you would about a mainstream premium SUV: ' +
  'retentionScore and rarityLabel should reflect desirability and condition within the used-SUV segment — a ' +
  'well-optioned, low-mileage, well-documented GTS or Turbo is genuinely stronger than a base Macan with a thin ' +
  'history, but avoid collector-market language ("cote de collection", "future classique", "valeur de ' +
  'collection") unless the car is a genuinely limited or special edition. The 2019 facelift (95B.2+) and the ' +
  'Macan Electric represent real generational jumps (infotainment, driver assistance, and for the Electric the ' +
  'entire powertrain) that meaningfully affect desirability and resale — weigh generation accordingly. For ' +
  'estimatedFairPrice on a Macan, reason about the current used-SUV (or, for the Electric, used-EV) market for ' +
  'this configuration, not a collector-car framing.';

const PRICE_ESTIMATE_GUIDE =
  'For estimatedFairPrice: reason about a realistic fair market price for this exact car given its year, ' +
  'mileage, generation/phase, present options and general knowledge of the current market for this model (see ' +
  'FAMILY_CONTEXT_GUIDE below for how that market framing differs by modelFamily) — not a mechanical formula. ' +
  'If the listed price seems fair, estimatedFairPrice can be close to or equal to it. Explain your reasoning in ' +
  'priceRationale (2-3 sentences, French) — cite the specific factors that moved your estimate up or down ' +
  '(rarity/desirability, options, condition signals, market trend for this generation). If the price field is ' +
  'missing, omit estimatedFairPrice and say so in priceRationale.';

const HISTORY_VALUE_GUIDE =
  'Documented history is a real value driver, in both directions — factor it into retentionScore and ' +
  'estimatedFairPrice explicitly, not just into historyHighlights: (1) Rich, specific documented history ' +
  '(service invoices, full book, known ownership chain, notable recent work like a clutch or engine rebuild) ' +
  'is a genuine positive — let it lift retentionScore and estimatedFairPrice, and mention it in valueAnalysis ' +
  '.factors. (2) Missing, vague, or inconsistent history (no service record for the mileage/age, no books, ' +
  '"historique inconnu") is a genuine negative — let it lower retentionScore and estimatedFairPrice, and turn ' +
  'it into a concrete negotiationArguments entry (e.g. "aucun historique d\'entretien fourni — argument pour ' +
  'négocier ou budgéter une inspection complète"). Absence of any history information at all (buyer simply ' +
  'didn\'t mention it) is neutral, not automatically negative — only penalize when the listing itself signals ' +
  'a gap (mileage/age inconsistency, explicit "no books", etc), matching category (4) above.';

const PORSCHE_APPROVED_GUIDE =
  'If porscheApproved is true, treat it as a strong positive factor: the car has passed Porsche\'s own ' +
  'certified pre-owned inspection and typically carries a manufacturer warranty — mention it as a value/' +
  'retention factor and let it reduce (but not eliminate) generic condition-related vigilance points. Its ' +
  'absence is not itself a negative signal — most genuine, good listings are not Porsche Approved.';

const WARRANTY_GUIDE =
  'Seller warranty (the warranty field) is an important buyer-confidence factor — always address it ' +
  'explicitly, in both directions: (1) A stated warranty (e.g. "12 mois", "garantie constructeur 24 mois") is ' +
  'a genuine positive — mention it by name and duration in valueAnalysis.factors and let it support ' +
  'retentionScore/estimatedFairPrice; a long or manufacturer-backed warranty can also offset some generic ' +
  'condition-related vigilance points. (2) No warranty stated, especially from a professional seller who ' +
  'would normally offer one, is a real negotiation lever and worth a vigilance point (severity "info" or ' +
  '"warning") — phrase it factually (e.g. "aucune garantie mentionnée — à négocier ou vérifier auprès du ' +
  'vendeur") and add a corresponding negotiationArguments entry. Never invent a duration or terms beyond ' +
  'what warranty explicitly states.';

const analysisTool = {
  name: 'report_analysis',
  description: 'Report an expert-style analysis of this Porsche (911 or Macan) listing for a prospective buyer.',
  input_schema: {
    type: 'object' as const,
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
      historyHighlights: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Positive documented-history points found in the seller description (service records, number of ' +
          'owners, maintenance invoices, notable work done). Only include what is explicitly stated — leave ' +
          'this empty if the description has no real history detail, rather than restating generic praise.',
      },
      valueAnalysis: {
        type: 'object',
        properties: {
          retentionScore: { type: 'number', description: '0 to 10' },
          rarityLabel: {
            type: 'string',
            description: 'Short badge label ONLY — 1 to 3 words, e.g. "Faible", "Modérée", "Élevée", ' +
              '"Très recherchée". Never a sentence or list of reasons; put those in factors instead.',
          },
          trend: { type: 'string', enum: ['up', 'stable', 'down'] },
          trendLabel: {
            type: 'string',
            description: 'Short badge label ONLY — 2 to 4 words, e.g. "Plus-value attendue", "Stabilité ' +
              'garantie", "Risque de décote". Never a sentence or list of reasons; put those in factors instead.',
          },
          factors: { type: 'array', items: { type: 'string' } },
          estimatedFairPrice: { type: 'number', description: 'AI-reasoned fair price in EUR, see instructions' },
          priceRationale: { type: 'string' },
        },
        required: ['retentionScore', 'rarityLabel', 'trend', 'trendLabel', 'factors', 'priceRationale'],
      },
    },
    required: ['vigilancePoints', 'negotiationArguments', 'valueAnalysis'],
  },
};

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

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Requête invalide.' }, 400);
  }

  const id = body.id?.trim();
  if (!id) return jsonResponse({ error: 'id manquant.' }, 400);

  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError || !listing) return jsonResponse({ error: "Annonce introuvable." }, 404);

  const presentOptions = (listing.options ?? [])
    .filter((o: { present: boolean }) => o.present)
    .map((o: { label: string }) => o.label);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [analysisTool],
    tool_choice: { type: 'tool', name: 'report_analysis' },
    system:
      'You are a Porsche buying expert (911 and Macan) writing for a French-speaking used-car search tool. ' +
      'Write every text field in French. Base your analysis on general, well-known facts about ' +
      "this model line/generation's typical issues and market — never invent specific " +
      "facts about this exact car that you can't know (service history, accident record, etc), " +
      'except where explicitly grounded in the seller description text as described below. ' +
      'This is a general opinion the buyer should independently verify, not a verified inspection. The ' +
      'listing\'s modelFamily field tells you which car this is — apply the matching guides below and ignore ' +
      'the ones for the other model line.\n\n' +
      `${OPTIONS_PRIORITY_GUIDE}\n\n${SUSPICIOUS_SIGNALS_911_GUIDE}\n\n${SUSPICIOUS_SIGNALS_MACAN_GUIDE}\n\n${FAMILY_CONTEXT_GUIDE}\n\n${PRICE_ESTIMATE_GUIDE}\n\n${HISTORY_VALUE_GUIDE}\n\n${PORSCHE_APPROVED_GUIDE}\n\n${WARRANTY_GUIDE}`,
    messages: [
      {
        role: 'user',
        content:
          `Analyze this listing:\n${JSON.stringify(
            {
              modelFamily: listing.model_family ?? '911',
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
              porscheApproved: listing.porsche_approved ?? false,
              warranty: listing.warranty ?? null,
              sellerDescription: listing.seller_description ?? null,
            },
            null,
            2
          )}\n\n` +
          'Reminder: sellerDescription above may be in Italian, German, English or any other language — ' +
          'that is expected and you should still read it for facts. But every text field you write in ' +
          'report_analysis (titles, descriptions, factors, priceRationale, historyHighlights, everything) ' +
          'must be in French, regardless of what language the source text is in. Never mirror the input language.',
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use') as
    | {
        input: {
          vigilancePoints: unknown;
          negotiationArguments: unknown;
          valueAnalysis: unknown;
          historyHighlights?: unknown;
        };
      }
    | undefined;
  if (!toolUse) return jsonResponse({ error: "L'IA n'a pas produit d'analyse exploitable." }, 502);

  const { vigilancePoints, negotiationArguments, valueAnalysis, historyHighlights } = toolUse.input;

  const { error: updateError } = await supabase
    .from('listings')
    .update({
      vigilance_points: vigilancePoints,
      negotiation_arguments: negotiationArguments,
      value_analysis: valueAnalysis,
      history_highlights: historyHighlights ?? [],
    })
    .eq('id', id);
  if (updateError) return jsonResponse({ error: `Échec de la sauvegarde : ${updateError.message}` }, 500);

  return jsonResponse({ vigilancePoints, negotiationArguments, valueAnalysis, historyHighlights: historyHighlights ?? [] });
});
