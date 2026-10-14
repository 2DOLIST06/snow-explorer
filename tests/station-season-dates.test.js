const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const automatic = require('../src/lib/stationAutomaticData');
const { normalizeAdminStation, normalizeAdminWidgets } = require('../src/lib/adminStation');
const { getStationOverviewScope } = require('../src/lib/stationOverview');

test('station dates fall back to valid legacy widgets', () => {
  const widgets = { snow: { openingDate: '2026-12-01', closingDate: '2027-04-01', season: { openingDate: '2026-12-02', closingDate: '2027-04-02' } } };
  for (const value of [undefined, null, '', 'bad', '2026-02-30', '2026-13-01', true]) {
    const station = { season_open_date: value, season_close_date: value };
    assert.equal(getStationOverviewScope(station, widgets).openDate, '2026-12-02');
    assert.equal(getStationOverviewScope(station, widgets).closeDate, '2027-04-02');
    assert.equal(normalizeAdminStation(station, widgets).season_open_date, '2026-12-02');
    assert.equal(normalizeAdminStation(station, widgets).season_close_date, '2027-04-02');
  }
  assert.equal(automatic.normalizeSeasonDate('2028-02-29'), '2028-02-29');
  assert.equal(automatic.normalizeSeasonDate('2026-12-01T00:00:00Z'), '2026-12-01');
  assert.deepEqual(normalizeAdminWidgets(widgets).snow, widgets.snow, 'admin save configuration retains legacy blocks');
});

test('season dates preserve station priority and resolve each legacy date independently', () => {
  const widgets = { snow: { enabled: false, openingDate: '2026-12-01', closingDate: '2027-04-01', season: { openingDate: '2026-12-02', closingDate: 'bad' } } };
  assert.deepEqual(automatic.resolveStationSeasonDates({}, widgets), { openDate: '2026-12-02', closeDate: '2027-04-01' });
  const station = { season_open_date: '2026-11-28T00:00:00Z', season_close_date: '2027-04-18' };
  assert.deepEqual(automatic.resolveStationSeasonDates(station, widgets), { openDate: '2026-11-28', closeDate: '2027-04-18' });
  assert.deepEqual(automatic.resolveStationSeasonDates({}, { snow: { openingDate: '2026-02-30' } }), { openDate: null, closeDate: null });
  const scope = getStationOverviewScope(station, widgets);
  const admin = normalizeAdminStation(station, widgets);
  assert.equal(scope.openDate, admin.season_open_date);
  assert.equal(scope.closeDate, admin.season_close_date);
});

test('server-rendered station props retain both legacy date formats with snow widget disabled', () => {
  const source = fs.readFileSync('pages/stations/[slug].tsx', 'utf8');
  assert.match(source, /openingDate: cfg\.snow\?\.openingDate/);
  assert.match(source, /closingDate: cfg\.snow\?\.closingDate/);
  assert.match(source, /openingDate: cfg\.snow\.season\.openingDate/);
  assert.match(source, /closingDate: cfg\.snow\.season\.closingDate/);
});
