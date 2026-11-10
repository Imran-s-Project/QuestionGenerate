/** Random permutation that never returns the input order unchanged, so a shuffled set always differs from the original. */
export const shuffle = a => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return a.length > 1 && b.every((x, i) => x === a[i]) ? [...b.slice(1), b[0]] : b;
};
