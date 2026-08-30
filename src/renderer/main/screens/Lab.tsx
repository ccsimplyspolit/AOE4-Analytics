import { lazy, Suspense, useEffect } from 'react'
import { Database, FileVideo, FlaskConical, Radio, Wrench } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { ScreenTabs } from '../components/ScreenTabs'
import { Spinner } from '../components/feedback'
import { useI18n } from '../../i18n'
import { recallHub, rememberHub } from '../hubMemory'

const Tincture = lazy(() => import('./Tincture').then((m) => ({ default: m.Tincture })))
const ReplayLab = lazy(() => import('./ReplayLab').then((m) => ({ default: m.ReplayLab })))
const DataStudio = lazy(() => import('./DataStudio').then((m) => ({ default: m.DataStudio })))
const StreamDesk = lazy(() => import('./StreamDesk').then((m) => ({ default: m.StreamDesk })))
const Tools = lazy(() => import('./Tools').then((m) => ({ default: m.Tools })))

const SECTIONS = [
  { id: 'tincture', label: 'Tincture', icon: FlaskConical },
  { id: 'replays', label: 'Replay Lab', icon: FileVideo },
  { id: 'studio', label: 'Data Studio', icon: Database },
  { id: 'stream', label: 'Stream Desk', icon: Radio },
  { id: 'club', label: 'Club Lab', icon: Wrench },
] as const

type Section = (typeof SECTIONS)[number]['id']
const SECTION_IDS = SECTIONS.map((item) => item.id)

export function Lab() {
  const { tt } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('section')
  const section: Section = SECTION_IDS.includes(raw as Section)
    ? (raw as Section)
    : recallHub('lab', SECTION_IDS, 'tincture')
  const setSection = (id: Section) =>
    setSearchParams(
      () => {
        const next = new URLSearchParams()
        next.set('section', id)
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    rememberHub('lab', section)
  }, [section])

  return (
    <div className="animate-fade-in space-y-6">
      <PageHead
        kicker="Workshop"
        title="Lab"
        sub="Five tools, one place: Tincture, Replay Lab, Data Studio, Stream Desk, and Club Lab."
      />
      <ScreenTabs
        items={SECTIONS}
        value={section}
        onChange={setSection}
        ariaLabel={tt('Lab tools')}
      />
      <Suspense fallback={<Spinner label={tt('Loading…')} />}>
        {section === 'tincture' && <Tincture embedded />}
        {section === 'replays' && <ReplayLab embedded />}
        {section === 'studio' && <DataStudio embedded />}
        {section === 'stream' && <StreamDesk embedded />}
        {section === 'club' && <Tools embedded />}
      </Suspense>
    </div>
  )
}
