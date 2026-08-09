/* eslint-disable react-refresh/only-export-components -- route table, not a component module */
import { lazy, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Database,
  Globe2,
  Compass,
  BookOpen,
  FlaskConical,
  FileVideo,
  Radio,
  Settings as SettingsIcon,
  Info,
  type LucideIcon,
} from 'lucide-react'

// Screens are lazy so each route (and its heavy deps, e.g. recharts + static
// game data) loads on first visit instead of in the entry bundle.
const Dashboard = lazy(() => import('./screens/Dashboard').then((m) => ({ default: m.Dashboard })))
const Scout = lazy(() => import('./screens/Scout').then((m) => ({ default: m.Scout })))
const Stats = lazy(() => import('./screens/Stats').then((m) => ({ default: m.Stats })))
const DataStudio = lazy(() =>
  import('./screens/DataStudio').then((m) => ({ default: m.DataStudio })),
)
const Explorer = lazy(() => import('./screens/Explorer').then((m) => ({ default: m.Explorer })))
const CivMeta = lazy(() => import('./screens/CivMeta').then((m) => ({ default: m.CivMeta })))
const Guides = lazy(() => import('./screens/Guides').then((m) => ({ default: m.Guides })))
const Tincture = lazy(() => import('./screens/Tincture').then((m) => ({ default: m.Tincture })))
const ReplayLab = lazy(() => import('./screens/ReplayLab').then((m) => ({ default: m.ReplayLab })))
const StreamDesk = lazy(() =>
  import('./screens/StreamDesk').then((m) => ({ default: m.StreamDesk })),
)
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
const About = lazy(() => import('./screens/About').then((m) => ({ default: m.About })))

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  element: ReactNode
  group: 'main' | 'secondary'
}

/** Single source of truth for routes + sidebar links. */
export const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, element: <Dashboard />, group: 'main' },
  { path: '/stats', label: 'My Stats', icon: BarChart3, element: <Stats />, group: 'main' },
  {
    path: '/data-studio',
    label: 'Data Studio',
    icon: Database,
    element: <DataStudio />,
    group: 'main',
  },
  { path: '/explorer', label: 'Explorer', icon: Compass, element: <Explorer />, group: 'main' },
  { path: '/scout', label: 'Scout', icon: Search, element: <Scout />, group: 'main' },
  { path: '/civ-meta', label: 'Civ Meta', icon: Globe2, element: <CivMeta />, group: 'main' },
  { path: '/guides', label: 'Guides', icon: BookOpen, element: <Guides />, group: 'main' },
  {
    path: '/tincture',
    label: 'Tincture',
    icon: FlaskConical,
    element: <Tincture />,
    group: 'main',
  },
  { path: '/replays', label: 'Replay Lab', icon: FileVideo, element: <ReplayLab />, group: 'main' },
  { path: '/stream', label: 'Stream Desk', icon: Radio, element: <StreamDesk />, group: 'main' },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    element: <Settings />,
    group: 'secondary',
  },
  { path: '/about', label: 'About', icon: Info, element: <About />, group: 'secondary' },
]
