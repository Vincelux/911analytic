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
 * Projects the indicative value forward by re-applying the same age/mileage
 * curve used in getIndicativeValue to a hypothetical future state. This is a
 * transparent heuristic, not a market forecast — it answers "given this
 * holding period and mileage, how does the car's position on the usual
 * depreciation curve change" rather than predicting real market prices.
 */
export function getValueProjection(car: CarListing, input: ValueProjectionInput): ValueProjection | null {
  const currentValue = getIndicativeValue(car);
  if (currentValue == null) return null;

  const years = Math.max(0, input.years);
  const kmPerYear = Math.max(0, input.kmPerYear);

  const age = car.year == null ? 0 : Math.max(0, new Date().getFullYear() - car.year);
  const mileage = car.mileage ?? 0;
  const ageAdjustmentNow = Math.max(0.82, 1 - age * 0.006);
  const mileageAdjustmentNow = Math.max(0.88, 1 - Math.max(0, mileage - 50000) / 1000000);

  const futureAge = age + years;
  const futureMileage = mileage + years * kmPerYear;
  const ageAdjustmentFuture = Math.max(0.82, 1 - futureAge * 0.006);
  const mileageAdjustmentFuture = Math.max(0.88, 1 - Math.max(0, futureMileage - 50000) / 1000000);

  const projectedValue = Math.round(
    currentValue * (ageAdjustmentFuture / ageAdjustmentNow) * (mileageAdjustmentFuture / mileageAdjustmentNow)
  );
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
