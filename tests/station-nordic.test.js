const test = require('node:test');
const assert = require('node:assert/strict');
const { getStationNordicOverview, getStationOverviewScope } = require('../src/lib/stationOverview');
test('Nordic section stays hidden when absent, disabled, empty or zero-only', () => {
  for (const nordique of [undefined, {}, { enabled: false, ski_area_km: 25 }, { enabled: true }, { enabled: true, pistes_count: 0 }]) {
    assert.equal(getStationNordicOverview({ nordique }), null);
  }
});
test('Nordic-only and mixed stations keep independent distances and difficulties', () => {
  const widgets = { nordique: { enabled: true, ski_area_km: 12.5, pistes_count: 4, blue: 2, classic: true, skating: true }, pistes: { colors: { blue: 9 } } };
  const result = getStationNordicOverview(widgets);
  assert.equal(result.stats.find(s => s.key === 'ski_area_km').value, 12.5);
  assert.deepEqual(result.techniques, ['Classique', 'Skating']);
  assert.equal(getStationOverviewScope({}, widgets).skiAreaKm, undefined);
  const alpine = getStationOverviewScope({ ski_area_km: 80, pistes_count: 20 }, widgets);
  assert.equal(alpine.skiAreaKm, 80);
  assert.equal(alpine.pistes[0].value, 9);
});

const { getDefaultSkiDiscipline } = require('../src/lib/stationOverview');
test('default discipline compares distances with strict Alpine priority above 20 km', () => {
  for (const [alpine, nordic, expected] of [
    [3, 120, 'nordic'], [15, 10, 'alpine'], [21, 120, 'alpine'],
    [20, 120, 'nordic'], [20.01, 120, 'alpine'], [20, 20, 'alpine'],
    [null, 12, 'nordic'], [10, undefined, 'alpine'], [undefined, undefined, 'alpine'],
    [NaN, 12, 'nordic'], [Infinity, 12, 'nordic'], [-5, 12, 'nordic']
  ]) assert.equal(getDefaultSkiDiscipline(alpine, nordic), expected, `${alpine} / ${nordic}`);
});
