# Initial station HTML

Canonical station pages now load optional observations, daily forecasts and nearby
webcams on the server, after checking that the station exists and is active.
The existing components receive initial data, render it as HTML, and refresh it
in the browser. No separate crawler-only content is served.

- Météo-France: reuse the backend weather endpoint and its provider cache. Do not
  cache the response's freshness flag on the frontend server. Preserve validity
  time, stale status, post altitude/distance and measured snow depth at that post.
- Open-Meteo: reuse daily forecast normalization; bounded process cache, 5 minutes.
  Forecast dates and provider remain visible in the forecast panel.
- Windy: server-only existing WEBCAMS_API_KEY, nearby query within 30 km, common
  mapping/filtering with the browser proxy; bounded process cache, 60 seconds.
  Preserve capture dates and provider links when actually supplied. Existing
  browser fetching retains the bbox fallback and image URL renewal.
- Optional server requests run concurrently with a 2.5-second timeout each.
  Errors do not fail the station page; the client can retry after hydration.
  An observation timeout renders an unavailable message, never invented values.
- Plan links are present without opening a modal, including image and generic
  official-map cases. Existing Calameo links remain unchanged.
- Forfaits already use server-loaded data and remain unchanged. No live piste or
  lift opening count is fabricated from seasonal dates or total piste counts.

The caches are per-process and not shared between deployment instances. A cold
instance can add up to 2.5 seconds for optional data. The existing backend cache
is particularly important for observation latency. This change does not require
new secrets or database migrations.

Validation: TypeScript check, production Next.js build and automated tests for
server-rendered weather/webcam/map HTML, independent upstream failures, cache
behaviour, station transitions, and the existing station/forfait suite.
Live credentials and production data availability must be checked on deployment.
