const test = require('node:test');
const assert = require('node:assert/strict');
const { stationNameAt, stationNameOf } = require('../src/lib/stationName');

test('French station names use contractions and elisions without changing the name itself', () => {
  for (const [name, at, of] of [
    ['Le Lac Blanc', 'au Lac Blanc', 'du Lac Blanc'],
    ['Le Grand-Bornand', 'au Grand-Bornand', 'du Grand-Bornand'],
    ['Les Gets', 'aux Gets', 'des Gets'],
    ['Les Deux Alpes', 'aux Deux Alpes', 'des Deux Alpes'],
    ['La Plagne', 'à La Plagne', 'de La Plagne'],
    ["L'Alpe d'Huez", "à l’Alpe d'Huez", "de l’Alpe d'Huez"],
    ['L’Alpe d’Huez', 'à l’Alpe d’Huez', 'de l’Alpe d’Huez'],
    ['Avoriaz', 'à Avoriaz', 'd’Avoriaz'],
    ['Évian', 'à Évian', 'd’Évian'],
    ['Isola 2000', 'à Isola 2000', 'd’Isola 2000'],
    ['Méribel', 'à Méribel', 'de Méribel'],
    ['Lélex', 'à Lélex', 'de Lélex'],
    ['Lescheraines', 'à Lescheraines', 'de Lescheraines'],
    ['Hauteluce', 'à Hauteluce', 'de la station Hauteluce'],
    ['Huez', 'à Huez', 'de la station Huez'],
    ['Yvoire', 'à Yvoire', 'de la station Yvoire'],
    ['  Le  Lac Blanc  ', 'au Lac Blanc', 'du Lac Blanc'],
  ]) {
    assert.equal(stationNameAt(name), at, name);
    assert.equal(stationNameOf(name), of, name);
  }
});
test('absent or malformed names use a grammatical fallback', () => {
  for (const value of [null, undefined, '', '   ', {}, 42]) {
    assert.equal(stationNameAt(value), 'à la station');
    assert.equal(stationNameOf(value), 'de la station');
  }
});
