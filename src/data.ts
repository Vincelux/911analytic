export type OptionKey = 'x51' | 'pse' | 'chrono' | 'sportSeats' | 'sportChrono' | 'carbonBrakes';

export interface CarOption {
  key: OptionKey;
  label: string;
  present: boolean;
}

export interface VigilancePoint {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface PricePoint {
  year: number;
  price: number;
}

export interface ValueAnalysisData {
  retentionScore: number;
  rarityLabel: string;
  trend: 'up' | 'stable' | 'down';
  trendLabel: string;
  factors: string[];
}

export interface CarListing {
  id: string;
  model: string;
  generation: string;
  phase: string | null;
  image: string | null;
  price: number;
  mileage: number;
  year: number;
  power: number;
  fuelType: string;
  transmission: string;
  country: string;
  countryFlag: string;
  city: string;
  seller: string;
  sellerType: 'Professionnel' | 'Particulier';
  sellerRating: number | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  listingUrl: string;
  listingSource: string;
  /** AI conformity score — null for listings added manually, since no AI has evaluated them. */
  conformity: number | null;
  publishedDaysAgo: number;
  options: CarOption[];
  vigilancePoints: VigilancePoint[];
  negotiationArguments: string[];
  priceHistory: PricePoint[];
  valueAnalysis: ValueAnalysisData;
  /** Free-text note, only used for manually-added listings. */
  notes?: string | null;
}

/** ISO country-code lookup for the countries a listing can be tagged with, used to render flags. */
export const countryFlagCodes: Record<string, string> = {
  France: 'FR',
  Allemagne: 'DE',
  Italie: 'IT',
  Espagne: 'ES',
  Belgique: 'BE',
  'Pays-Bas': 'NL',
  Suisse: 'CH',
  Autriche: 'AT',
  Portugal: 'PT',
  Luxembourg: 'LU',
};

export const generations = ['Classique', 'G-Modell', '964', '993', '996', '997', '991', '992'] as const;
export type Generation = (typeof generations)[number];

export const fuelTypes = ['Essence', 'Hybride', 'Électrique'] as const;
export type FuelType = (typeof fuelTypes)[number];

export const transmissions = ['Manuelle', 'Automatique / PDK'] as const;
export type Transmission = (typeof transmissions)[number];

export const sellerTypes = ['Tous', 'Professionnel', 'Particulier'] as const;
export type SellerType = (typeof sellerTypes)[number];

export const publicationDates = ['Moins de 24h', 'Moins de 7 jours', 'Moins de 30 jours', 'Toutes'] as const;
export type PublicationDate = (typeof publicationDates)[number];

export const countries = [
  'Europe Globale',
  'Allemagne',
  'France',
  'Italie',
  'Espagne',
  'Belgique',
  'Pays-Bas',
  'Suisse',
  'Autriche',
  'Portugal',
  'Luxembourg',
] as const;
export type Country = (typeof countries)[number];

export const ratingOptions = ['Toutes', '3 étoiles et +', '4 étoiles et +', '4.5 étoiles et +'] as const;
export type Rating = (typeof ratingOptions)[number];

export interface FilterState {
  generation: Generation | 'Toutes';
  yearMin: number;
  yearMax: number;
  priceMin: number;
  priceMax: number;
  kmMin: number;
  kmMax: number;
  powerMin: number;
  fuelType: FuelType | 'Toutes';
  transmission: Transmission | 'Toutes';
  country: Country;
  sellerType: SellerType;
  publicationDate: PublicationDate;
  rating: Rating;
}

export const defaultFilters: FilterState = {
  generation: 'Toutes',
  yearMin: 1964,
  yearMax: 2026,
  priceMin: 0,
  priceMax: 500000,
  kmMin: 0,
  kmMax: 300000,
  powerMin: 0,
  fuelType: 'Toutes',
  transmission: 'Toutes',
  country: 'Europe Globale',
  sellerType: 'Tous',
  publicationDate: 'Toutes',
  rating: 'Toutes',
};

const allOptions: CarOption[] = [
  { key: 'x51', label: 'X51 Powerkit', present: false },
  { key: 'pse', label: 'Échappement Sport PSE', present: false },
  { key: 'chrono', label: 'Chrono Plus', present: false },
  { key: 'sportSeats', label: 'Sièges Sport', present: false },
  { key: 'sportChrono', label: 'Pack Sport Chrono', present: false },
  { key: 'carbonBrakes', label: 'Freins Carbone PCCB', present: false },
];

function opts(present: OptionKey[]): CarOption[] {
  return allOptions.map((o) => ({ ...o, present: present.includes(o.key) }));
}

export const listings: CarListing[] = [
  {
    id: '1',
    model: '911 Carrera S',
    generation: '997',
    phase: 'Phase I',
    image: 'https://images.pexels.com/photos/36626909/pexels-photo-36626909.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 42500,
    mileage: 82000,
    year: 2005,
    power: 355,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'France',
    countryFlag: 'FR',
    city: 'Lyon',
    seller: 'Auto Lyon Premium',
    sellerType: 'Professionnel',
    sellerRating: 4.2,
    sellerPhone: "+33 4 78 00 00 01",
    sellerEmail: "contact@autolyonpremium.fr",
    listingUrl: "https://www.leboncoin.fr/voiture/911-carrera-s-997-1",
    listingSource: "LeBonCoin",
    conformity: 72,
    publishedDaysAgo: 2,
    options: opts(['pse', 'chrono']),
    vigilancePoints: [
      { severity: 'critical', title: 'Alerte Cylindres Rayés', description: 'Moteur 3.8 Phase I — risque connu de rayures de cylindre. Test Piwi impératif + contrôle compression.' },
      { severity: 'warning', title: 'Embrayage non documenté', description: 'Aucune facture de remplacement mentionnée. Budget prévisionnel ~1 200 € à prévoir.' },
      { severity: 'info', title: 'IMS non confirmé', description: 'Roulement IMS original potentiellement non remplacé. Demander preuve ou prévoir remplacement.' },
    ],
    negotiationArguments: [
      'Absence du kit X51 et sièges sport — options représentant ~4 500 € à neuf, manquantes sur ce modèle.',
      'Kilométrage supérieur à 80 000 km sans preuve de vidange boîte PDK récente — risque de surcoût immédiat.',
      'Aucune facture d\'embrayage — argument fort pour obtenir une remise de 1 500 à 2 000 €.',
    ],
    priceHistory: [
      { year: 2005, price: 95000 }, { year: 2007, price: 72000 }, { year: 2009, price: 55000 },
      { year: 2011, price: 42000 }, { year: 2013, price: 36000 }, { year: 2015, price: 33000 },
      { year: 2017, price: 32000 }, { year: 2019, price: 34000 }, { year: 2021, price: 38000 },
      { year: 2023, price: 41000 }, { year: 2025, price: 43000 }, { year: 2026, price: 42500 },
    ],
    valueAnalysis: {
      retentionScore: 6.5, rarityLabel: 'Modérée', trend: 'stable', trendLabel: 'Stabilité garantie',
      factors: [
        'Phase I moins recherchée que la Phase II (évolutions moteur et DFI)',
        'Problème connu des cylindres rayés qui pèse sur la cote',
        'Kits X51 et options sportives très recherchés si présents',
        'Commence à attirer les collectionneurs du « dernier flat-6 atmosphérique »',
      ],
    },
  },
  {
    id: '2',
    model: '911 Carrera S',
    generation: '997',
    phase: 'Phase II',
    image: 'https://images.pexels.com/photos/31636698/pexels-photo-31636698.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 58900,
    mileage: 51000,
    year: 2009,
    power: 385,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'France',
    countryFlag: 'FR',
    city: 'Bordeaux',
    seller: 'Particulier',
    sellerType: 'Particulier',
    sellerRating: 4.5,
    sellerPhone: "+33 5 56 00 00 02",
    sellerEmail: "particulier.bordeaux@example.fr",
    listingUrl: "https://www.lacentrale.fr/annonce-911-997-2",
    listingSource: "La Centrale",
    conformity: 85,
    publishedDaysAgo: 1,
    options: opts(['x51', 'pse', 'chrono', 'sportSeats', 'sportChrono']),
    vigilancePoints: [
      { severity: 'warning', title: 'Distribution à vérifier', description: 'Courroie accessoire à 60 000 km non facturée. Contrôle visuel recommandé.' },
      { severity: 'info', title: 'Coque PCM 3.0', description: 'Mise à jour firmware PCM conseillée pour compatibilité Bluetooth récente.' },
      { severity: 'info', title: 'Pneus arrière', description: 'Usure estimée à 40 % restant. Négociable sur le prix ou remplacement à demander.' },
    ],
    negotiationArguments: [
      'Pneus arrière à 40 % d\'usure restant — demande de remplacement ou remise de 600 € justifiée.',
      'Courroie accessoire non facturée à 60 000 km — intervention à programmer, ~350 € à négocier.',
      'Prix affiché 5 % au-dessus de la cote Argus pour cette configuration — marge de négociation de 2 500 à 3 000 €.',
    ],
    priceHistory: [
      { year: 2009, price: 105000 }, { year: 2011, price: 82000 }, { year: 2013, price: 62000 },
      { year: 2015, price: 50000 }, { year: 2017, price: 45000 }, { year: 2019, price: 47000 },
      { year: 2021, price: 52000 }, { year: 2023, price: 56000 }, { year: 2025, price: 59500 },
      { year: 2026, price: 58900 },
    ],
    valueAnalysis: {
      retentionScore: 8.5, rarityLabel: 'Élevée', trend: 'up', trendLabel: 'Plus-value attendue',
      factors: [
        'Fiabilité moteur grandement améliorée (DFI, plus de cylindres rayés)',
        'Boîte PDK Gen 2 réputée pour sa robustesse',
        'Dernière 997 à moteur atmosphérique avant le turbo de la 991',
        'Cote en hausse continue depuis 2020, demande supérieure à l\'offre',
      ],
    },
  },
  {
    id: '3',
    model: '911 Carrera 4S',
    generation: '991',
    phase: 'Phase I',
    image: 'https://images.pexels.com/photos/30968112/pexels-photo-30968112.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 78000,
    mileage: 38000,
    year: 2013,
    power: 400,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'Allemagne',
    countryFlag: 'DE',
    city: 'Stuttgart',
    seller: 'Porsche Center Stuttgart',
    sellerType: 'Professionnel',
    sellerRating: 4.8,
    sellerPhone: "+49 711 000 0003",
    sellerEmail: "verkauf@porsche-stuttgart.de",
    listingUrl: "https://www.mobile.de/fahrzeuge/911-4s-991-1",
    listingSource: "mobile.de",
    conformity: 91,
    publishedDaysAgo: 0,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono', 'carbonBrakes']),
    vigilancePoints: [
      { severity: 'info', title: 'Première révision des 40 000 km', description: 'Approche de la révision majeure. Vérifier que le carnet est à jour.' },
      { severity: 'info', title: 'PCM 3.1', description: 'Système de navigation potentiellement non mis à jour. Mise à jour possible chez Porsche.' },
    ],
    negotiationArguments: [
      'Révision des 40 000 km imminente — coût estimé 800 à 1 200 €, argument de négociation.',
      'Prix légèrement supérieur au marché allemand pour ce kilométrage — marge de 2 000 à 3 500 €.',
      'Absence du kit X51 sur une 4S — option rare et recherchée, manque de valeur à souligner.',
    ],
    priceHistory: [
      { year: 2013, price: 120000 }, { year: 2015, price: 85000 }, { year: 2017, price: 70000 },
      { year: 2019, price: 62000 }, { year: 2021, price: 68000 }, { year: 2023, price: 74000 },
      { year: 2025, price: 79000 }, { year: 2026, price: 78000 },
    ],
    valueAnalysis: {
      retentionScore: 7.5, rarityLabel: 'Modérée', trend: 'stable', trendLabel: 'Stabilité garantie',
      factors: [
        '991 Phase I — première génération à élargissement d\'empattement, controversée mais aboutie',
        'Moteur 3.4 atmosphérique, dernier Carrera sans turbo (hors GT3)',
        'Cote stable, légère hausse depuis 2022',
        '4S avec transmission intégrale, recherchée dans les régions montagneuses',
      ],
    },
  },
  {
    id: '4',
    model: '911 GT3',
    generation: '991',
    phase: 'GT3',
    image: 'https://images.pexels.com/photos/37985719/pexels-photo-37985719.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 145000,
    mileage: 18000,
    year: 2016,
    power: 475,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'Allemagne',
    countryFlag: 'DE',
    city: 'Munich',
    seller: 'GT Motors Munich',
    sellerType: 'Professionnel',
    sellerRating: 4.9,
    sellerPhone: "+49 89 000 0004",
    sellerEmail: "info@gtmotors-munich.de",
    listingUrl: "https://www.mobile.de/fahrzeuge/911-gt3-991",
    listingSource: "mobile.de",
    conformity: 95,
    publishedDaysAgo: 3,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono', 'carbonBrakes']),
    vigilancePoints: [
      { severity: 'warning', title: 'Historique piste à vérifier', description: 'GT3 potentiellement utilisée en track days. Demander le data logger et l\'historique des tours.' },
      { severity: 'info', title: 'Rodage moteur', description: 'Vérifier que le rodage des 3 000 km a été respecté (indicateur dans le PCM).' },
    ],
    negotiationArguments: [
      'Historique piste non documenté — risque de surusure moteur, argument pour 5 000 à 8 000 € de remise.',
      'Pneus sport semi-slicks à vérifier — remplacement à ~2 000 € si usés.',
      'Garantie Porsche Extended Performance expirée — négocier une extension ou une remise équivalente.',
    ],
    priceHistory: [
      { year: 2016, price: 180000 }, { year: 2018, price: 150000 }, { year: 2020, price: 135000 },
      { year: 2022, price: 155000 }, { year: 2024, price: 148000 }, { year: 2026, price: 145000 },
    ],
    valueAnalysis: {
      retentionScore: 9.5, rarityLabel: 'Très élevée', trend: 'up', trendLabel: 'Plus-value attendue',
      factors: [
        'GT3 991.1 — dernier GT3 à moteur atmosphérique 3.8 (475 ch)',
        'Version PDK ultra recherchée pour la conduite sur piste',
        'Production limitée, demande très supérieure à l\'offre',
        'Cote en forte hausse depuis 2021, phénomène de collection confirmé',
      ],
    },
  },
  {
    id: '5',
    model: '911 Carrera',
    generation: '993',
    phase: 'Carrera',
    image: 'https://images.pexels.com/photos/38234790/pexels-photo-38234790.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 89000,
    mileage: 65000,
    year: 1996,
    power: 272,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'Italie',
    countryFlag: 'IT',
    city: 'Milano',
    seller: 'Classic Auto Milano',
    sellerType: 'Professionnel',
    sellerRating: 4.6,
    sellerPhone: "+39 02 000 0005",
    sellerEmail: "info@classicautomilano.it",
    listingUrl: "https://www.autoscout24.it/911-993-carrera",
    listingSource: "AutoScout24",
    conformity: 88,
    publishedDaysAgo: 5,
    options: opts(['pse', 'sportSeats']),
    vigilancePoints: [
      { severity: 'critical', title: 'Trappe de fusée avant', description: 'Point de corrosion connu sur la 993. Inspection impérative du longeron avant.' },
      { severity: 'warning', title: 'Chauffage pneumatique', description: 'Système de chauffage pneumatique à air souvent défaillant. Remplacement par kit électrique fréquent.' },
      { severity: 'info', title: 'Joint de culasse', description: 'Remplacement du joint de culasse recommandé si jamais fait. Budget ~1 500 €.' },
    ],
    negotiationArguments: [
      'Corrosion longeron avant à expertiser — si présente, remise de 3 000 à 5 000 € justifiée.',
      'Système de chauffage pneumatique probablement à remplacer — budget ~800 €.',
      'Kilométrage de 65 000 km non certifié (compteur analogique) — demander les factures originales.',
    ],
    priceHistory: [
      { year: 1996, price: 70000 }, { year: 2000, price: 45000 }, { year: 2005, price: 35000 },
      { year: 2010, price: 30000 }, { year: 2015, price: 42000 }, { year: 2018, price: 55000 },
      { year: 2020, price: 68000 }, { year: 2022, price: 78000 }, { year: 2024, price: 86000 },
      { year: 2026, price: 89000 },
    ],
    valueAnalysis: {
      retentionScore: 9.8, rarityLabel: 'Très élevée', trend: 'up', trendLabel: 'Plus-value attendue',
      factors: [
        'Dernière génération à refroidissement par air — statut culte absolu',
        'Cote en hausse continue et soutenue depuis 2015',
        'Modèle de collection confirmé, demande mondiale supérieure à l\'offre',
        'Boîte manuelle 6 vitesses recherchée par les puristes',
      ],
    },
  },
  {
    id: '6',
    model: '911 Carrera S',
    generation: '992',
    phase: 'Carrera S',
    image: 'https://images.pexels.com/photos/28984433/pexels-photo-28984433.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 132000,
    mileage: 12000,
    year: 2022,
    power: 450,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'Belgique',
    countryFlag: 'BE',
    city: 'Bruxelles',
    seller: 'Porsche Brussels',
    sellerType: 'Professionnel',
    sellerRating: 4.7,
    sellerPhone: "+32 2 000 0006",
    sellerEmail: "sales@porsche-brussels.be",
    listingUrl: "https://www.autoscout24.be/911-992-carrera-s",
    listingSource: "AutoScout24",
    conformity: 93,
    publishedDaysAgo: 1,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono', 'carbonBrakes']),
    vigilancePoints: [
      { severity: 'info', title: 'Garantie constructeur', description: 'Véhicule encore sous garantie Porsche jusqu\'en 2024. Vérifier le transfert.' },
      { severity: 'info', title: 'Mises à jour logicielles', description: 'Vérifier que toutes les campagnes de rappel et mises à jour PCM ont été effectuées.' },
    ],
    negotiationArguments: [
      'Véhicule récent sous garantie — peu de marge, mais options non incluses à négocier (entretien offert, kit hiver).',
      'Prix au-dessus du neuf configuré équivalent — comparer avec commande directe chez Porsche.',
      'Pneus d\'origine potentiellement à remplacer prochainement (usure prématurée connue sur 992).',
    ],
    priceHistory: [
      { year: 2022, price: 145000 }, { year: 2023, price: 138000 }, { year: 2024, price: 134000 },
      { year: 2025, price: 132000 }, { year: 2026, price: 132000 },
    ],
    valueAnalysis: {
      retentionScore: 7.0, rarityLabel: 'Faible', trend: 'down', trendLabel: 'Décote résiduelle',
      factors: [
        '992 encore en production — décote normale en cours',
        'Motorisation turbo 3.0 décriée par les puristes, impact modéré sur la cote',
        'Marché saturé de 992 d\'occasion récentes, pression sur les prix',
        'Rétention attendue à long terme incertaine, dépend de l\'évolution du marché électrique',
      ],
    },
  },
  {
    id: '7',
    model: '911 Carrera 4',
    generation: '996',
    phase: 'Phase II',
    image: 'https://images.pexels.com/photos/2475808/pexels-photo-2475808.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 24500,
    mileage: 95000,
    year: 2003,
    power: 320,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'Espagne',
    countryFlag: 'ES',
    city: 'Barcelona',
    seller: 'Iberic Motors',
    sellerType: 'Professionnel',
    sellerRating: 3.9,
    sellerPhone: "+34 93 000 0007",
    sellerEmail: "info@ibericmotors.es",
    listingUrl: "https://www.coches.net/911-996-4",
    listingSource: "Coches.net",
    conformity: 58,
    publishedDaysAgo: 7,
    options: opts(['chrono', 'sportSeats']),
    vigilancePoints: [
      { severity: 'critical', title: 'Alerte IMS / RMS', description: '996 Phase II — roulement IMS et joint RMS à risque. Remplacement impératif si jamais fait.' },
      { severity: 'critical', title: 'Rayures cylindres', description: 'Moteur M96 connu pour les rayures de cylindre. Test compression + endoscopie recommandés.' },
      { severity: 'warning', title: 'Chauffage pneumatique', description: 'Système de chauffage à air souvent défaillant sur les 996. Remplacement par kit électrique.' },
    ],
    negotiationArguments: [
      'Roulement IMS non remplacé — remplacement obligatoire, budget ~2 500 € à déduire du prix.',
      'Kilométrage de 95 000 km élevé pour une 996 — argument principal pour une remise de 3 000 à 4 000 €.',
      'Note vendeur 3.9/5 — fiabilité du vendeur à questionner, demander expertise indépendante.',
    ],
    priceHistory: [
      { year: 2003, price: 65000 }, { year: 2006, price: 42000 }, { year: 2009, price: 28000 },
      { year: 2012, price: 20000 }, { year: 2015, price: 16000 }, { year: 2018, price: 18000 },
      { year: 2020, price: 21000 }, { year: 2022, price: 23000 }, { year: 2024, price: 24000 },
      { year: 2026, price: 24500 },
    ],
    valueAnalysis: {
      retentionScore: 5.0, rarityLabel: 'Faible', trend: 'stable', trendLabel: 'Stabilité garantie',
      factors: [
        '996 — génération la moins prisée des 911, mais abordable et en hausse',
        'Problèmes moteur M6/M96 bien documentés, freinent la cote',
        'Transmission intégrale 4 sur 996, peu courante, léger premium',
        'Commence à intéresser les jeunes collectionneurs pour son prix d\'entrée',
      ],
    },
  },
  {
    id: '8',
    model: '911 Turbo S',
    generation: '991',
    phase: 'Turbo S',
    image: 'https://images.pexels.com/photos/8631556/pexels-photo-8631556.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 165000,
    mileage: 22000,
    year: 2018,
    power: 580,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'Pays-Bas',
    countryFlag: 'NL',
    city: 'Amsterdam',
    seller: 'Dutch Exotics',
    sellerType: 'Professionnel',
    sellerRating: 4.8,
    sellerPhone: "+31 20 000 0008",
    sellerEmail: "info@dutchexotics.nl",
    listingUrl: "https://www.autoscout24.nl/911-991-turbo-s",
    listingSource: "AutoScout24",
    conformity: 94,
    publishedDaysAgo: 4,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono', 'carbonBrakes']),
    vigilancePoints: [
      { severity: 'info', title: 'Turbo variable', description: 'Géométrie variable des turbos à inspecter. Pas de défaut connu mais entretien crucial.' },
      { severity: 'info', title: 'PCCB', description: 'Freins carbone céramique à inspecter pour fissures. Remplacement très coûteux si nécessaire.' },
    ],
    negotiationArguments: [
      'Freins PCCB à expertiser — remplacement éventuel à plus de 8 000 €, argument majeur.',
      'Prix 5% au-dessus du marché néerlandais — marge de négociation de 5 000 à 7 000 €.',
      'Pneus arrière large à 40% restant — remplacement à ~400 € à négocier.',
    ],
    priceHistory: [
      { year: 2018, price: 220000 }, { year: 2020, price: 175000 }, { year: 2021, price: 168000 },
      { year: 2022, price: 172000 }, { year: 2023, price: 168000 }, { year: 2024, price: 166000 },
      { year: 2025, price: 165000 }, { year: 2026, price: 165000 },
    ],
    valueAnalysis: {
      retentionScore: 8.0, rarityLabel: 'Élevée', trend: 'stable', trendLabel: 'Stabilité garantie',
      factors: [
        'Turbo S 991.2 — 580 ch, performances supercars au quotidien',
        'Équipement très complet d\'origine, peu d\'options manquantes',
        'Cote stabilisée après décote initiale, peu de risque de baisse',
        'Demande forte pour les versions Turbo S en Europe du Nord',
      ],
    },
  },
  {
    id: '9',
    model: '911 Carrera RS',
    generation: '964',
    phase: 'RS',
    image: 'https://images.pexels.com/photos/34780616/pexels-photo-34780616.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 195000,
    mileage: 48000,
    year: 1992,
    power: 260,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'Suisse',
    countryFlag: 'CH',
    city: 'Genève',
    seller: 'Swiss Auto Collection',
    sellerType: 'Professionnel',
    sellerRating: 5.0,
    sellerPhone: "+41 22 000 0009",
    sellerEmail: "info@swissautocollection.ch",
    listingUrl: "https://www.autoscout24.ch/911-964-rs",
    listingSource: "AutoScout24",
    conformity: 96,
    publishedDaysAgo: 10,
    options: opts(['sportSeats']),
    vigilancePoints: [
      { severity: 'warning', title: 'Suspension sport', description: '964 RS à suspension ferme d\'origine. Vérifier l\'état des amortisseurs Bilstein.' },
      { severity: 'info', title: 'Allègement', description: 'Véhicule allégé d\'origine (absence de banquette arrière, vitres fines). Vérifier l\'authenticité.' },
    ],
    negotiationArguments: [
      'Amortisseurs sport d\'origine à vérifier — remplacement ~2 500 € si nécessaire.',
      'Authenticité RS à certifier par Porsche Classic — coût ~800 €, à inclure dans la négociation.',
      'Prix au-dessus de la cote suisse pour le kilométrage — marge de 8 000 à 12 000 €.',
    ],
    priceHistory: [
      { year: 1992, price: 80000 }, { year: 2000, price: 50000 }, { year: 2005, price: 60000 },
      { year: 2010, price: 85000 }, { year: 2015, price: 120000 }, { year: 2018, price: 155000 },
      { year: 2020, price: 175000 }, { year: 2022, price: 188000 }, { year: 2024, price: 192000 },
      { year: 2026, price: 195000 },
    ],
    valueAnalysis: {
      retentionScore: 10, rarityLabel: 'Exceptionnelle', trend: 'up', trendLabel: 'Plus-value attendue',
      factors: [
        '964 RS — édition légendaire, l\'une des 911 les plus recherchées au monde',
        'Production extrêmement limitée, exemplaires authentiques très rares',
        'Cote en hausse constante depuis 2010, phénomène de collection confirmé',
        'Dernière génération avant l\'ABS complet, caractère brut très apprécié',
      ],
    },
  },
  {
    id: '10',
    model: '911 Carrera GTS',
    generation: '991',
    phase: 'GTS',
    image: 'https://images.pexels.com/photos/9808/pexels-photo-9808.jpg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 98000,
    mileage: 28000,
    year: 2015,
    power: 430,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'Autriche',
    countryFlag: 'AT',
    city: 'Wien',
    seller: 'Alpine Auto Wien',
    sellerType: 'Professionnel',
    sellerRating: 4.4,
    sellerPhone: "+43 1 000 0010",
    sellerEmail: "info@alpineauto-wien.at",
    listingUrl: "https://www.willhaben.at/911-991-gts",
    listingSource: "Willhaben",
    conformity: 89,
    publishedDaysAgo: 6,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono']),
    vigilancePoints: [
      { severity: 'info', title: 'Pack Sport Chrono', description: 'Vérifier le bon fonctionnement du bouton Sport Plus sur le volant.' },
      { severity: 'info', title: 'Échappement PSE', description: 'Vérifier l\'état des clapets de l\'échappement sport (corrosion possible).' },
    ],
    negotiationArguments: [
      'Révision des 30 000 km imminente — budget ~600 €, à négocier.',
      'Boîte manuelle sur 991 GTS — rareté recherchée, mais pneus sport à vérifier.',
      'Prix au-dessus de la cote autrichienne de 3 000 € — marge de négociation réaliste.',
    ],
    priceHistory: [
      { year: 2015, price: 135000 }, { year: 2017, price: 105000 }, { year: 2019, price: 85000 },
      { year: 2021, price: 88000 }, { year: 2023, price: 95000 }, { year: 2025, price: 98000 },
      { year: 2026, price: 98000 },
    ],
    valueAnalysis: {
      retentionScore: 7.5, rarityLabel: 'Modérée', trend: 'stable', trendLabel: 'Stabilité garantie',
      factors: [
        'GTS 991.1 — dernière 911 atmosphérique en version GTS',
        'Boîte manuelle 7 vitesses, de plus en plus rare et recherchée',
        'Cote stabilisée, légère hausse depuis 2022',
        'Position idéale entre Carrera S et GT3 pour l\'usage quotidien',
      ],
    },
  },
  {
    id: '11',
    model: '911 Targa 4S',
    generation: '992',
    phase: 'Targa 4S',
    image: 'https://images.pexels.com/photos/5589320/pexels-photo-5589320.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 155000,
    mileage: 8000,
    year: 2023,
    power: 450,
    fuelType: 'Essence',
    transmission: 'Automatique / PDK',
    country: 'Portugal',
    countryFlag: 'PT',
    city: 'Lisboa',
    seller: 'Iberic Sports Cars',
    sellerType: 'Professionnel',
    sellerRating: 4.3,
    sellerPhone: "+351 21 000 0011",
    sellerEmail: "info@ibericsportscars.pt",
    listingUrl: "https://www.standvirtual.com/911-992-targa-4s",
    listingSource: "Standvirtual",
    conformity: 90,
    publishedDaysAgo: 2,
    options: opts(['pse', 'chrono', 'sportSeats', 'sportChrono']),
    vigilancePoints: [
      { severity: 'info', title: 'Toit Targa', description: 'Mécanisme du toit Targa à tester plusieurs fois. Système complexe, entretien coûteux.' },
      { severity: 'info', title: 'Garantie', description: 'Véhicule sous garantie constructeur. Vérifier le transfert international de la garantie.' },
    ],
    negotiationArguments: [
      'Mécanisme Targa à expertiser — entretien futur potentiellement coûteux, argument de précaution.',
      'Véhicule quasi neuf — peu de marge, négocier entretien offert et extension de garantie.',
      'Toit Targa rare sur le marché d\'occasion — prix justifié mais options manquantes à souligner.',
    ],
    priceHistory: [
      { year: 2023, price: 168000 }, { year: 2024, price: 160000 }, { year: 2025, price: 156000 },
      { year: 2026, price: 155000 },
    ],
    valueAnalysis: {
      retentionScore: 6.5, rarityLabel: 'Modérée', trend: 'down', trendLabel: 'Décote résiduelle',
      factors: [
        'Targa 992 — mécanisme du toit iconique mais complexe et coûteux à entretenir',
        'Décote normale en cours, véhicule encore récent',
        'Rareté relative sur le marché, mais demande niche',
        'Cote à surveiller, la Targa décote généralement plus qu\'un Coupé',
      ],
    },
  },
  {
    id: '12',
    model: '911 Carrera S',
    generation: '997',
    phase: 'Phase II',
    image: 'https://images.pexels.com/photos/4227198/pexels-photo-4227198.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    price: 52000,
    mileage: 67000,
    year: 2010,
    power: 385,
    fuelType: 'Essence',
    transmission: 'Manuelle',
    country: 'Luxembourg',
    countryFlag: 'LU',
    city: 'Luxembourg',
    seller: 'Particulier',
    sellerType: 'Particulier',
    sellerRating: 3.5,
    sellerPhone: "+352 00 000 0012",
    sellerEmail: "particulier.luxembourg@example.lu",
    listingUrl: "https://www.autoscout24.lu/911-997-2-lux",
    listingSource: "AutoScout24",
    conformity: 78,
    publishedDaysAgo: 8,
    options: opts(['pse', 'chrono', 'sportSeats']),
    vigilancePoints: [
      { severity: 'warning', title: 'Historique d\'entretien', description: 'Vendeur particulier — demander l\'intégralité du carnet d\'entretien et des factures.' },
      { severity: 'warning', title: 'Embrayage', description: '67 000 km en boîte manuelle — embrayage potentiellement en fin de vie. Budget ~1 500 €.' },
      { severity: 'info', title: 'PCM 3.0', description: 'Système PCM à mettre à jour pour compatibilité Bluetooth.' },
    ],
    negotiationArguments: [
      'Vendeur particulier sans garantie — argument principal pour une remise de 2 000 à 3 000 €.',
      'Embrayage à 67 000 km non facturé — remplacement imminent, ~1 500 € à déduire.',
      'Note vendeur 3.5/5 — manquements dans l\'historique à exploiter pour la négociation.',
    ],
    priceHistory: [
      { year: 2010, price: 100000 }, { year: 2012, price: 75000 }, { year: 2014, price: 58000 },
      { year: 2016, price: 48000 }, { year: 2018, price: 45000 }, { year: 2020, price: 47000 },
      { year: 2022, price: 50000 }, { year: 2024, price: 52000 }, { year: 2026, price: 52000 },
    ],
    valueAnalysis: {
      retentionScore: 8.0, rarityLabel: 'Élevée', trend: 'up', trendLabel: 'Plus-value attendue',
      factors: [
        '997 Phase II en boîte manuelle — configuration de plus en plus rare',
        'Cote en hausse, la 997 devient un modèle culte',
        'Dernière 911 à moteur atmosphérique avant la 991 turbo',
        'Demande forte pour les versions manuelles, offre limitée',
      ],
    },
  },
];

export function filterListings(listings: CarListing[], filters: FilterState): CarListing[] {
  return listings.filter((car) => {
    if (filters.generation !== 'Toutes' && car.generation !== filters.generation) return false;
    if (car.year < filters.yearMin || car.year > filters.yearMax) return false;
    if (car.price < filters.priceMin || car.price > filters.priceMax) return false;
    if (car.mileage < filters.kmMin || car.mileage > filters.kmMax) return false;
    if (car.power < filters.powerMin) return false;
    if (filters.fuelType !== 'Toutes' && car.fuelType !== filters.fuelType) return false;
    if (filters.transmission !== 'Toutes' && car.transmission !== filters.transmission) return false;
    if (filters.country !== 'Europe Globale' && car.country !== filters.country) return false;
    if (filters.sellerType !== 'Tous' && car.sellerType !== filters.sellerType) return false;
    if (filters.publicationDate !== 'Toutes') {
      if (filters.publicationDate === 'Moins de 24h' && car.publishedDaysAgo >= 1) return false;
      if (filters.publicationDate === 'Moins de 7 jours' && car.publishedDaysAgo >= 7) return false;
      if (filters.publicationDate === 'Moins de 30 jours' && car.publishedDaysAgo >= 30) return false;
    }
    if (filters.rating !== 'Toutes') {
      const minRating = parseFloat(filters.rating);
      if (car.sellerRating == null || car.sellerRating < minRating) return false;
    }
    return true;
  });
}
