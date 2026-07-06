// Centralised bill maths so every screen + invoice agrees.
//
// discountType: 'none' | 'percent' | 'fixed'
// Returns the full breakdown used by the UI and printable invoice.

export function computeBill({ items = [], discountType = 'none', discountValue = 0, gstRate = 0 }) {
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.qty || 1) * Number(i.rate ?? i.amount ?? 0)),
    0
  )

  let discountAmount = 0
  if (discountType === 'percent') discountAmount = (subtotal * Number(discountValue || 0)) / 100
  else if (discountType === 'fixed') discountAmount = Number(discountValue || 0)
  discountAmount = Math.min(discountAmount, subtotal) // never below zero

  const taxable = subtotal - discountAmount
  const gstAmount = (taxable * Number(gstRate || 0)) / 100
  const grandTotal = taxable + gstAmount

  return {
    subtotal: round(subtotal),
    discountAmount: round(discountAmount),
    taxable: round(taxable),
    gstAmount: round(gstAmount),
    grandTotal: round(grandTotal),
  }
}

const round = (n) => Math.round((Number(n) || 0) * 100) / 100

// Normalise a line item to { desc, qty, rate, amount }
export const lineAmount = (item) =>
  round(Number(item.qty || 1) * Number(item.rate ?? item.amount ?? 0))
