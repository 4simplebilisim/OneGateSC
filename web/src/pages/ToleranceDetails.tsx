import { useNavigate, useParams } from 'react-router-dom'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/PageHeader'
import { LinkTab, type LF } from '../components/LinkTab'

// Birim-bazlı tolerans detayları: bir toleransta N satır, her satır BİR birim + o birim için alt/üst yüzde.
// Ör. "kg" satırı → Alt %0 / Üst %10; "adet" satırı → Alt %0 / Üst %15.
const DETAIL_FIELDS: LF[] = [
  { name: 'unitId', label: 'Birim', type: 'ref', ref: 'units', required: true },
  { name: 'lowerPercent', label: 'Alt Yüzde (%)', type: 'number' },
  { name: 'upperPercent', label: 'Üst Yüzde (%)', type: 'number' },
]

export const ToleranceDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <div className="og-page" style={{ maxWidth: 1040 }}>
      <PageHeader
        title="Tolerans — Birim Detayları"
        subtitle="Her satır bir ölçü birimi için alt/üst yüzde toleransı tanımlar (ör. kg → Üst %10, adet → Üst %15). Referans miktarın yüzdesi kadar sapma kabul edilir."
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Geri</Button>}
      />
      {id && <LinkTab ownerField="toleranceId" ownerId={Number(id)} resource="operation-tolerance-details" fields={DETAIL_FIELDS} uniqueField="unitId" />}
    </div>
  )
}
