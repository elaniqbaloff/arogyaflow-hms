// Tiny CSV exporter — builds a file and triggers a browser download.

const esc = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => esc(c.label)).join(',')
  const body = rows
    .map((row) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','))
    .join('\n')
  const csv = `${header}\n${body}`

  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel/Arabic
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
