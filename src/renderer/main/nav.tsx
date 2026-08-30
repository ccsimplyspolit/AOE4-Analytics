/* eslint-disable react-refresh/only-export-components -- route table, not a component module */
import { lazy, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
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
  Trophy,
  Medal,
  Tv,
  Wrench,
  Swords,
  Settings as SettingsIcon,
  Info,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

const Dashboard = lazy(() => import('./screens/Dashboard').then((m) => ({ default: m.Dashboard })))
const Scout = lazy(() => import('./screens/Scout').then((m) => ({ default: m.Scout })))
const Stats = lazy(() => import('./screens/Stats').then((m) => ({ default: m.Stats })))
const Explorer = lazy(() => import('./screens/Explorer').then((m) => ({ default: m.Explorer })))
const CivMeta = lazy(() => import('./screens/CivMeta').then((m) => ({ default: m.CivMeta })))
const Guides = lazy(() => import('./screens/Guides').then((m) => ({ default: m.Guides })))
const Lab = lazy(() => import('./screens/Lab').then((m) => ({ default: m.Lab })))
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
const About = lazy(() => import('./screens/About').then((m) => ({ default: m.About })))

export type NavCluster = 'root' | 'stats' | 'explore' | 'lab' | 'tools'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  element: ReactNode
  group: 'main' | 'secondary'
  /** Header cluster. `root` items stay as top-level links. */
  cluster: NavCluster
}

/** Keep extra query params (Tincture tabs, Data Studio filters, Club Lab tools). */
function RouteAlias({
  to,
  set,
  defaults,
}: {
  to: string
  set?: Record<string, string>
  defaults?: Record<string, string>
}) {
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const next = new URLSearchParams(params)
  if (set) {
    for (const [key, value] of Object.entries(set)) next.set(key, value)
  }
  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      if (!next.get(key)) next.set(key, value)
    }
  }
  const search = next.toString()
  return <Navigate to={`${to}${search ? `?${search}` : ''}${hash}`} replace />
}

/** Single source of truth for routes and the sidebar. */
export const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    element: <Dashboard />,
    group: 'main',
    cluster: 'root',
  },
  {
    path: '/scout',
    label: 'Scout',
    icon: Search,
    element: <Scout />,
    group: 'main',
    cluster: 'root',
  },
  {
    path: '/leaderboards',
    label: 'Leaderboards',
    icon: Trophy,
    element: <RouteAlias to="/scout" set={{ section: 'ladders' }} />,
    group: 'main',
    cluster: 'root',
  },
  {
    path: '/stats',
    label: 'My Stats',
    icon: BarChart3,
    element: <Stats />,
    group: 'main',
    cluster: 'stats',
  },
  {
    path: '/civ-meta',
    label: 'Civ Meta',
    icon: Globe2,
    element: <CivMeta />,
    group: 'main',
    cluster: 'stats',
  },
  {
    path: '/matchups',
    label: 'Matchups',
    icon: Swords,
    element: <RouteAlias to="/civ-meta" set={{ tab: 'matchups' }} defaults={{ ladder: 'rm_solo' }} />,
    group: 'main',
    cluster: 'stats',
  },
  {
    path: '/tournaments',
    label: 'Tournaments',
    icon: Medal,
    element: <RouteAlias to="/scout" set={{ section: 'events' }} />,
    group: 'main',
    cluster: 'stats',
  },
  {
    path: '/explorer',
    label: 'Explorer',
    icon: Compass,
    element: <Explorer />,
    group: 'main',
    cluster: 'explore',
  },
  {
    path: '/patches',
    label: 'News & patches',
    icon: Newspaper,
    element: <RouteAlias to="/explorer" set={{ tab: 'patches' }} />,
    group: 'main',
    cluster: 'explore',
  },
  {
    path: '/guides',
    label: 'Guides',
    icon: BookOpen,
    element: <Guides />,
    group: 'main',
    cluster: 'root',
  },
  {
    path: '/lab',
    label: 'Lab',
    icon: FlaskConical,
    element: <Lab />,
    group: 'main',
    cluster: 'lab',
  },
  {
    path: '/tincture',
    label: 'Tincture',
    icon: FlaskConical,
    element: <RouteAlias to="/lab" set={{ section: 'tincture' }} />,
    group: 'main',
    cluster: 'lab',
  },
  {
    path: '/replays',
    label: 'Replay Lab',
    icon: FileVideo,
    element: <RouteAlias to="/lab" set={{ section: 'replays' }} />,
    group: 'main',
    cluster: 'lab',
  },
  {
    path: '/data-studio',
    label: 'Data Studio',
    icon: Database,
    element: <RouteAlias to="/lab" set={{ section: 'studio' }} />,
    group: 'main',
    cluster: 'lab',
  },
  {
    path: '/stream',
    label: 'Stream Desk',
    icon: Radio,
    element: <RouteAlias to="/lab" set={{ section: 'stream' }} />,
    group: 'main',
    cluster: 'lab',
  },
  {
    path: '/tools',
    label: 'Club Lab',
    icon: Wrench,
    element: <RouteAlias to="/lab" set={{ section: 'club' }} />,
    group: 'main',
    cluster: 'tools',
  },
  {
    path: '/twitch-finder',
    label: 'Twitch Finder',
    icon: Tv,
    element: <RouteAlias to="/lab" set={{ section: 'stream', view: 'twitch' }} />,
    group: 'main',
    cluster: 'tools',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    element: <Settings />,
    group: 'secondary',
    cluster: 'root',
  },
  {
    path: '/about',
    label: 'About',
    icon: Info,
    element: <About />,
    group: 'secondary',
    cluster: 'root',
  },
]

export const SIDEBAR_SECTIONS: { id: string; label: string; paths: readonly string[] }[] = [
  { id: 'play', label: 'Play', paths: ['/', '/scout', '/guides', '/explorer'] },
  { id: 'stats', label: 'Ranked', paths: ['/stats', '/civ-meta'] },
  { id: 'lab', label: 'Lab', paths: ['/lab'] },
]

/** Old bookmarks still resolve; they are not listed in the sidebar. */
export const SIDEBAR_HIDDEN_ALIASES = [
  '/matchups',
  '/leaderboards',
  '/tournaments',
  '/patches',
  '/tincture',
  '/replays',
  '/data-studio',
  '/stream',
  '/tools',
  '/twitch-finder',
] as const

export function isNavPathActive(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/'
  if (path === '/stats') return pathname === '/stats' || pathname.startsWith('/profile/')
  if (path === '/civ-meta')
    return pathname === '/civ-meta' || pathname.startsWith('/civ-meta/') || pathname.startsWith('/matchups')
  if (path === '/scout')
    return pathname === '/scout' || pathname.startsWith('/scout') || pathname === '/leaderboards' || pathname === '/tournaments'
  if (path === '/explorer')
    return pathname === '/explorer' || pathname.startsWith('/explorer') || pathname === '/patches'
  if (path === '/lab')
    return (
      pathname === '/lab' ||
      pathname.startsWith('/lab') ||
      pathname === '/tincture' ||
      pathname === '/replays' ||
      pathname === '/data-studio' ||
      pathname === '/stream' ||
      pathname === '/tools' ||
      pathname === '/twitch-finder'
    )
  return pathname === path || pathname.startsWith(`${path}/`)
}
