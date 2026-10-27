// answer: array of option ids for option types, string for 'text'
export function isCorrect(q, answer) {
  if (answer == null) return false;

  if (q.type === 'text') {
    const a = String(answer).trim().toLowerCase();
    return q.correct.some((c) => String(c).trim().toLowerCase() === a);
  }

  const given = [...new Set([].concat(answer).map(Number))].sort((x, y) => x - y);
  const right = [...q.correct].map(Number).sort((x, y) => x - y);
  return given.length === right.length && given.every((v, i) => v === right[i]);
}
    
// 50% of the points for being correct, up to 50% more for speed
export function calcPoints(q, correct, responseMs, limitMs) {
  if (!correct) return 0;
  const remaining = Math.max(0, limitMs - responseMs) / limitMs;
  return Math.round(q.points * (0.5 + 0.5 * remaining));
}