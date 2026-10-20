/** French prepositions for display only; stored names and URLs remain untouched. */
/** @param {unknown} value */
function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}
/** @param {unknown} value */
function stationNameAt(value) {
  const name = cleanName(value);
  if (!name) return 'à la station';
  if (/^le\s+/i.test(name)) return `au ${name.replace(/^le\s+/i, '')}`;
  if (/^les\s+/i.test(name)) return `aux ${name.replace(/^les\s+/i, '')}`;
  if (/^l['’]/i.test(name)) return `à l’${name.slice(2)}`;
  return `à ${name}`;
}
/** @param {unknown} value */
function stationNameOf(value) {
  const name = cleanName(value);
  if (!name) return 'de la station';
  if (/^le\s+/i.test(name)) return `du ${name.replace(/^le\s+/i, '')}`;
  if (/^les\s+/i.test(name)) return `des ${name.replace(/^les\s+/i, '')}`;
  if (/^l['’]/i.test(name)) return `de l’${name.slice(2)}`;
  if (/^la\s+/i.test(name)) return `de ${name}`;
  if (/^[aàâäæeéèêëiîïoôöœuùûü]/i.test(name)) return `d’${name}`;
  // H and Y can require or forbid elision; avoid guessing pronunciation.
  if (/^[hy]/i.test(name)) return `de la station ${name}`;
  return `de ${name}`;
}
module.exports = { stationNameAt, stationNameOf };
