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

// Flat scoring: calcPoints returns q.points when correct, else 0
export function calcPoints(q, correct) {
  if (!correct) return 0;
  return q.points;
}
