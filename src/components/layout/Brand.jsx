export function LeafMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="11" fill="#184334" />
      <path
        d="M29 9c0 10-6.2 17.4-15 19.6.1-1.4.5-2.8 1.1-4.1C11.6 23.3 10 19.6 10 16c5 1.3 7.6.1 10-2.4 2-2.1 5-3.8 9-4.6z"
        fill="#d8a73e"
      />
      <path
        d="M14 31c2.6-6.4 7.6-11.4 13-14.2"
        stroke="#184334"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

import { BRAND } from '../../config/brand'

export function BrandWordmark({ light = false, compact = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LeafMark size={compact ? 32 : 38} />
      {!compact && (
        <div className="leading-tight">
          <p className={`font-display text-base font-semibold ${light ? 'text-white' : 'text-brand-900'}`}>
            {BRAND.productRoot}<span className={light ? 'text-gold-300' : 'text-gold-500'}>{BRAND.productSuffix}</span>
          </p>
          <p className={`text-[10px] uppercase tracking-[0.18em] ${light ? 'text-brand-100/70' : 'text-ink/40'}`}>
            {BRAND.client.shortName}
          </p>
        </div>
      )}
    </div>
  )
}
