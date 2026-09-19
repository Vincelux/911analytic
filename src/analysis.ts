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
  const optionsAdjustment = 1 + Math.min(0.04, (car.options?.length ?? 0) * 0.005);
  const estimate = historyAverage * ageAdjustment * mileageAdjustment * ratingAdjustment * optionsAdjustment;
  return Math.round(Math.max(car.price * 0.75, Math.min(car.price * 1.1, estimate)));
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
