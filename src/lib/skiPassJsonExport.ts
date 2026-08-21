import type { SkiPassSeason } from "@/types/skiPass";

export const SKI_PASS_TEMPLATE = {
  _instructions: {
    usage: "Supprimez ce bloc _instructions avant l’import, puis remplissez les tableaux periods et passes.",
    dates: "start_date et end_date utilisent le format AAAA-MM-JJ.",
    period_id: "Chaque tarif doit référencer l’id d’une période déclarée dans periods.",
    price_type: 'Valeurs autorisées : "fixed" ou "dynamic".',
    fixed_price: 'Pour "fixed", renseignez price et laissez price_min/price_max à null.',
    dynamic_price: 'Pour "dynamic", laissez price à null et renseignez price_min et price_max.',
    nullable_fields: "name (période), duration_days, source_url et label peuvent être null.",
    label: "label est une note facultative affichée avec une étoile sous la grille.",
    sort_order: "Entier déterminant l’ordre d’affichage, en commençant par 0.",
    period_fields: "id, name, start_date, end_date, sort_order.",
    pass_fields: "id, name, duration_days, duration_label, sort_order, prices.",
    price_fields: "period_id, category, category_label, price_type, price, price_min, price_max, label.",
  },
  station: "slug-de-la-station",
  season: "2026-2027",
  currency: "EUR",
  source_url: null,
  periods: [],
  passes: [],
};

export function skiPassExport(stationSlug: string, season: SkiPassSeason) {
  return {
    station: stationSlug,
    season: season.season,
    currency: season.currency,
    source_url: season.source_url ?? null,
    periods: season.periods.map(({ id, name, start_date, end_date, sort_order }) => ({ id, name: name ?? null, start_date, end_date, sort_order })),
    passes: season.passes.map(({ id, name, duration_days, duration_label, sort_order, prices }) => ({
      id,
      name,
      duration_days,
      duration_label,
      sort_order,
      prices: prices.map(price => ({
        period_id: price.period_id,
        category: price.category,
        category_label: price.category_label,
        price_type: price.price_type,
        price: price.price,
        price_min: price.price_min,
        price_max: price.price_max,
        label: price.label ?? null,
      })),
    })),
  };
}

export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
