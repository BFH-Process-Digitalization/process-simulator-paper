const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042]
export const t95 = (df) => (df <= 30 ? T95[df - 1] : 1.96 + 2.4 / df)

/** Wilson score interval for a binomial proportion. */
export function binom(k, n, z = 1.959964) {
  const p = k / n
  const den = 1 + (z * z) / n
  const centre = (p + (z * z) / (2 * n)) / den
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den
  return { n, k, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) }
}

export function ci(xs) {
  const n = xs.length
  const mean = xs.reduce((a, b) => a + b, 0) / n
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0
  const half = n > 1 ? (t95(n - 1) * sd) / Math.sqrt(n) : Infinity
  return { n, mean, sd, half, lo: mean - half, hi: mean + half }
}

/** Erlang C: mean waiting time in queue for M/M/c. */
export function mmcWait(lambda, mu, c) {
  const a = lambda / mu
  const rho = a / c
  let sum = 0
  let term = 1
  for (let k = 0; k < c; k++) {
    sum += term
    term *= a / (k + 1)
  }
  const tail = term / (1 - rho)
  return tail / (sum + tail) / (c * mu - lambda)
}

/** Pollaczek-Khinchine: mean waiting time in queue for M/G/1 with service mean m and variance v. */
export function mg1Wait(lambda, m, v) {
  const rho = lambda * m
  return (lambda * (v + m * m)) / (2 * (1 - rho))
}
