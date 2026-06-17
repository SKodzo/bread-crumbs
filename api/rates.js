export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  try {
    const key = process.env.FRED_API_KEY;
    if (!key) throw new Error("No FRED key");

    const [r30, r15] = await Promise.all([
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${key}&limit=1&sort_order=desc&file_type=json`).then(r => r.json()),
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US&api_key=${key}&limit=1&sort_order=desc&file_type=json`).then(r => r.json()),
    ]);

    const conv30 = parseFloat(r30.observations[0].value);
    const conv15 = parseFloat(r15.observations[0].value);
    const updated = r30.observations[0].date;

    res.json({
      conv30,
      conv15,
      fha30:    Math.round((conv30 + 0.25) * 100) / 100,
      va30:     Math.round((conv30 - 0.35) * 100) / 100,
      arm5:     Math.round((conv30 - 0.75) * 100) / 100,
      updated,
    });
  } catch (_) {
    // Fallback to recent historical values when FRED key missing or API down
    res.json({ conv30: 6.89, conv15: 6.18, fha30: 7.14, va30: 6.54, arm5: 6.14, updated: null });
  }
}
