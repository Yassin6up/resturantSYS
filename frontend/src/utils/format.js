export function formatCurrency(value) {
  const n = parseFloat(value)
  return (Number.isFinite(n) ? n : 0).toFixed(2)
}

export default formatCurrency
