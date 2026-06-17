import type { ReactNode } from 'react'

/** OneGate standart sayfa başlığı — marka çizgisi + başlık + alt açıklama + sağ aksiyon. */
export const PageHeader = ({
  title,
  subtitle,
  extra,
}: {
  title: ReactNode
  subtitle?: ReactNode
  extra?: ReactNode
}) => (
  <div className="og-pageheader">
    <span className="og-pageheader__bar" />
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 className="og-pageheader__title">{title}</h1>
      {subtitle ? <div className="og-pageheader__sub">{subtitle}</div> : null}
    </div>
    {extra ? <div>{extra}</div> : null}
  </div>
)
