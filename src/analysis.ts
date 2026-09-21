import type { CarListing } from './data';

export type AnalysisBreakdown = {
  label: string;
  score: number;
};

/** Transparent heuristic used until a real market/valuation service is connected. Null when the listing has no price to base an estimate on. */
export function getIndicativeValue(car: CarListing): number | null {
  if (car.price == null) return null;
  const recent = (car.priceHistory ?? []).slice(-3).map((point) => point.price).filter((price) => price > 0);
  const historyAverage = recent.length ? recent.reduce((sum, price) => sum + price, 0) / recent.length : car.price;
  const age = car.year == null ? 0 : Math.max(0, new Date().getFullYear() - car.year);
  const ageAdjustment = Math.max(0.82, 1 - age * 0.006);
  const mileageAdjustment =
    car.mileage == null ? 1 : Math.max(0.88, 1 - Math.max(0, car.mileage - 50000) / 1000000);
  const ratingAdjustment =
    car.sellerRating == null ? 1 : 0.96 + Math.min(0.06, Math.max(0, car.sellerRating - 4) * 0.03);
  const presentOptions = (car.options ?? []).filter((o) => o.present).length;
  const optionsAdjustment = 1 + Math.min(0.04, presentOptions * 0.008);
  const estimate = historyAverage * ageAdjustment * mileageAdjustment * ratingAdjustment * optionsAdjustment;
  return Math.round(Math.max(car.price * 0.75, Math.min(car.price * 1.1, estimate)));
}

export interface ValueProjectionInput {
  /** Years the buyer plans to keep the car. */
  years: number;
  /** Kilometres the buyer expects to drive per year. */
  kmPerYear: number;
}

export interface ValueProjection {
  currentValue: number;
  projectedValue: number;
  deltaAbsolute: number;
  deltaPct: number;
}

/**
 * Projects the indicative value forward along the same age/mileage
 * depreciation curve used in getIndicativeValue, from now to a hypothetical
 * future state. This is a transparent heuristic, not a market forecast — it
 * answers "given this holding period and mileage, how does the car's
 * position on the usual depreciation curve change" rather than predicting
 * real market prices.
 *
 * Unlike getIndicativeValue, the two factors here are NOT individually
 * floored: getIndicativeValue clamps each factor (e.g. age can never push
 * the estimate down more than 18%) to keep a single absolute estimate
 * sane, but for a car already past that floor (30+ years old, or already
 * very high mileage), clamping both "now" and "future" to the same floor
 * would make the ratio between them exactly 1 — i.e. the projection would
 * never move no matter what years/mileage are entered. Using the raw,
 * unclamped factors for the ratio keeps the projection responsive for
 * older/higher-mileage cars too; a sanity range is applied to the final
 * output instead.
 */
export function getValueProjection(car: CarListing, input: ValueProjectionInput): ValueProjection | null {
  const currentValue = getIndicativeValue(car);
  if (currentValue == null) return null;

  const years = Math.max(0, Number.isFinite(input.years) ? input.years : 0);
  const kmPerYear = Math.max(0, Number.isFinite(input.kmPerYear) ? input.kmPerYear : 0);

  const age = car.year == null ? 0 : Math.max(0, new Date().getFullYear() - car.year);
  const mileage = car.mileage ?? 0;
  const ageFactor = (a: number) => 1 - a * 0.006;
  const mileageFactor = (m: number) => 1 - Math.max(0, m - 50000) / 1000000;

  const futureAge = age + years;
  const futureMileage = mileage + years * kmPerYear;

  const rawProjectedValue =
    currentValue * (ageFactor(futureAge) / ageFactor(age)) * (mileageFactor(futureMileage) / mileageFactor(mileage));
  const projectedValue = Math.round(Math.max(currentValue * 0.35, Math.min(currentValue * 1.5, rawProjectedValue)));
  const deltaAbsolute = projectedValue - currentValue;
  const deltaPct = Math.round((deltaAbsolute / currentValue) * 1000) / 10;

  return { currentValue, projectedValue, deltaAbsolute, deltaPct };
}

export function getAnalysisScore(car: CarListing): number {
  const penalty = (car.vigilancePoints ?? []).reduce((sum, item) => {
    if (item.severity === 'critical') return sum + 18;
    if (item.severity === 'warning') return sum + 9;
    return sum + 3;
  }, 0);
  const sellerBonus = car.sellerRating == null ? 0 : Math.min(10, Math.max(0, (car.sellerRating - 3.5) * 10));
  return Math.max(0, Math.min(100, Math.round(100 - penalty + sellerBonus)));
}

export function getAnalysisBreakdown(car: CarListing): AnalysisBreakdown[] {
  const vigilanceScore = Math.max(0, 100 - (car.vigilancePoints ?? []).reduce((sum, item) => sum + (item.severity === 'critical' ? 18 : item.severity === 'warning' ? 9 : 3), 0));
  const sellerScore = car.sellerRating == null ? 0 : Math.min(100, Math.max(0, Math.round(car.sellerRating * 20)));
  return [
    { label: 'Historique / vigilance', score: vigilanceScore },
    { label: 'Vendeur', score: sellerScore },
  ];
}
