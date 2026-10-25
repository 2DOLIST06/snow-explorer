const test = require('node:test');
const assert = require('node:assert/strict');
const { completeStationBatch } = require('../src/lib/completeStationBatch');

function completeBatch() {
  const station = { name: 'Complete', slug: 'complete', country_code: 'FR', region_id: 'region', department: 'Loire',
    website_url: 'https://example.com', latitude: 0, longitude: 0, altitude_min_m: 1000, altitude_max_m: 1500,
    ski_area_km: 2, pistes_count: 2, lifts_count: 1, season_open_date: '2026-12-19', season_close_date: '2027-03-15', description_md: 'Description' };
  return { batch_version: '1.0', scope: { season: '2026-2027' }, document: { schema_version: '1.0', stations: [{ station,
    pistes: { green: 1, blue: 1, red: 0, black: 0 }, remontees: { tire_fesses: 1, telesieges: 0, telepheriques: 0 },
    snowpark: { count: 0 }, forfaits_avances: { seasons: [{ season: '2026-2027', periods: [{}], passes: [{ prices: [{ price: 0 }] }] }] } }] },
    media: ['cover', 'logo', 'piste_map'].map(role => ({ station_slug: station.slug, role, status: 'found', source_url: 'https://example.com/media' })),
    research: [{ station_slug: station.slug }] };
}
test('exclude the whole incomplete station with its media and research, preserving zeros and input', () => {
  const input = completeBatch();
  const bad = structuredClone(input.document.stations[0]);
  bad.station.slug = 'incomplete'; bad.station.name = 'Incomplete'; delete bad.station.altitude_max_m; delete bad.forfaits_avances;
  input.document.stations.push(bad);
  input.media.push(...input.media.map(asset => ({ ...asset, station_slug: 'incomplete', ...(asset.role === 'piste_map' ? { status: 'not_found' } : {}) })));
  input.research.push({ station_slug: 'incomplete' });
  const before = JSON.stringify(input), result = completeStationBatch(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.batch.document.stations.length, 1);
  assert.equal(result.batch.media.length, 3);
  assert.equal(result.batch.research.length, 1);
  assert.deepEqual(result.excluded[0].fields, ['station.altitude_max_m', 'forfaits_avances.seasons', 'media.piste_map']);
});
test('no empty import is substituted for an entirely excluded batch', () => {
  const input = completeBatch(); delete input.document.stations[0].snowpark;
  const result = completeStationBatch(input);
  assert.equal(result.batch.document.stations.length, 0);
  assert.deepEqual(result.excluded[0].fields, ['snowpark.count']);
});
module.exports = { completeBatch };
