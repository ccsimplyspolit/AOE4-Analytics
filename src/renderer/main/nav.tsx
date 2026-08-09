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
  workspace?: WorkspaceId
}

export type WorkspaceId = 'command' | 'matches' | 'intel' | 'library' | 'broadcast'

export interface NavWorkspace {
  id: WorkspaceId
  label: string
  icon: LucideIcon
  defaultPath: string
}

/** The few persistent destinations in the command bar. */
export const navWorkspaces: NavWorkspace[] = [
  { id: 'command', label: 'Command Center', icon: LayoutDashboard, defaultPath: '/' },
  { id: 'matches', label: 'Match Lab', icon: Database, defaultPath: '/data-studio' },
  { id: 'intel', label: 'Intel', icon: Search, defaultPath: '/scout' },
  { id: 'library', label: 'Library', icon: BookOpen, defaultPath: '/guides' },
  { id: 'broadcast', label: 'Broadcast', icon: Radio, defaultPath: '/stream' },
]

/** Single source of truth for routes and contextual workspace links. */
export const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    element: <Dashboard />,
    group: 'main',
    workspace: 'command',
  },
  {
    path: '/stats',
    label: 'My Stats',
    icon: BarChart3,
    element: <Stats />,
    group: 'main',
    workspace: 'command',
  },
  {
    path: '/data-studio',
    label: 'Data Studio',
    icon: Database,
    element: <DataStudio />,
    group: 'main',
    workspace: 'matches',
  },
  {
    path: '/explorer',
    label: 'Explorer',
    icon: Compass,
    element: <Explorer />,
    group: 'main',
    workspace: 'library',
  },
  {
    path: '/scout',
    label: 'Scout',
    icon: Search,
    element: <Scout />,
    group: 'main',
    workspace: 'intel',
  },
  {
    path: '/civ-meta',
    label: 'Civ Meta',
    icon: Globe2,
    element: <CivMeta />,
    group: 'main',
    workspace: 'intel',
  },
  {
    path: '/guides',
    label: 'Guides',
    icon: BookOpen,
    element: <Guides />,
    group: 'main',
    workspace: 'library',
  },
  {
    path: '/tincture',
    label: 'Tincture',
    icon: FlaskConical,
    element: <Tincture />,
    group: 'main',
    workspace: 'command',
  },
  {
    path: '/replays',
    label: 'Replay Lab',
    icon: FileVideo,
    element: <ReplayLab />,
    group: 'main',
    workspace: 'matches',
  },
  {
    path: '/stream',
    label: 'Stream Desk',
    icon: Radio,
    element: <StreamDesk />,
    group: 'main',
    workspace: 'broadcast',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SettingsIcon,
    element: <Settings />,
    group: 'secondary',
  },
  { path: '/about', label: 'About', icon: Info, element: <About />, group: 'secondary' },
]

/** Resolve the workspace for top navigation, including detail routes. */
export function workspaceForPath(pathname: string): WorkspaceId | null {
  const direct = navItems.find((item) => item.path === pathname)?.workspace
  if (direct) return direct
  if (pathname.startsWith('/game/')) return 'command'
  if (pathname.startsWith('/profile/') || pathname.startsWith('/civ/')) return 'intel'
  if (pathname.startsWith('/public-game/')) return 'matches'
  return null
}
