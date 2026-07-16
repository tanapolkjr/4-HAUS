import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronsLeft, ChevronsRight, Columns3, Factory as FactoryIcon,
  LayoutDashboard, LogOut, Monitor, Moon, Plus, Settings, Sun,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { Tooltip } from '@/components/ui/Tooltip';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/factories', label: 'Factory', icon: FactoryIcon },
  { to: '/compare', label: 'Compare', icon: Columns3 },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const COLLAPSE_KEY = '4haus-sidebar-collapsed';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [newMenu, setNewMenu] = useState(false);
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleCollapse = () => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '0' : '1');
    setCollapsed(!collapsed);
  };

  const themeOrder: Theme[] = ['light', 'dark', 'system'];
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const cycleTheme = () => setTheme(themeOrder[(themeOrder.indexOf(theme) + 1) % 3]);

  const initials = (profile?.name ?? '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside
      className={`no-print shrink-0 h-screen sticky top-0 flex flex-col border-r border-line bg-surface
        transition-[width] duration-150 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-2 h-14 border-b border-line ${collapsed ? 'justify-center' : 'px-4'}`}>
        <span className="w-4 h-4 rounded-sm bg-accent shrink-0" aria-hidden />
        {!collapsed && <span className="text-[16px] font-semibold tracking-tight">4 HAUS</span>}
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 p-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 h-9 rounded px-2.5 text-[14px] transition-colors
              ${collapsed ? 'justify-center' : ''}
              ${isActive ? 'bg-subtle text-ink-1 font-medium' : 'text-ink-2 hover:bg-subtle hover:text-ink-1'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" aria-hidden />}
                <Icon size={20} className="shrink-0" />
                {!collapsed && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Global + New — most-used action, reachable from anywhere (spec §6) */}
      <div className="px-2 relative">
        <button
          onClick={() => setNewMenu((v) => !v)}
          className={`w-full h-9 rounded bg-accent text-white font-medium text-[13px]
            inline-flex items-center gap-1.5 hover:bg-accent-hover transition-colors
            ${collapsed ? 'justify-center' : 'justify-center'}`}
        >
          <Plus size={16} /> {!collapsed && 'New'}
        </button>
        {newMenu && (
          <div
            className="absolute left-2 right-2 mt-1 card shadow-overlay z-40 py-1"
            onMouseLeave={() => setNewMenu(false)}
          >
            <button
              className="w-full text-left px-3 h-9 text-[13px] hover:bg-subtle"
              onClick={() => { setNewMenu(false); navigate('/factories?new=product'); }}
            >
              New Product
            </button>
            <button
              className="w-full text-left px-3 h-9 text-[13px] hover:bg-subtle"
              onClick={() => { setNewMenu(false); navigate('/factories?new=factory'); }}
            >
              New Factory
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Footer: theme, collapse, user */}
      <div className="p-2 border-t border-line flex flex-col gap-1">
        <div className={`flex ${collapsed ? 'flex-col' : ''} gap-1`}>
          <Tooltip content={`Theme: ${theme}`}>
            <button onClick={cycleTheme} aria-label={`Theme: ${theme}`}
              className="h-8 w-8 rounded inline-flex items-center justify-center text-ink-2 hover:bg-subtle hover:text-ink-1">
              <ThemeIcon size={16} />
            </button>
          </Tooltip>
          <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <button onClick={toggleCollapse} aria-label="Toggle sidebar"
              className="h-8 w-8 rounded inline-flex items-center justify-center text-ink-2 hover:bg-subtle hover:text-ink-1">
              {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </Tooltip>
        </div>
        <div className={`flex items-center gap-2 p-1.5 rounded ${collapsed ? 'justify-center' : ''}`}>
          <span
            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)', color: 'var(--accent)' }}
          >
            {initials}
          </span>
          {!collapsed && (
            <>
              <span className="text-[13px] font-medium truncate flex-1">{profile?.name ?? '…'}</span>
              <Tooltip content="Sign out">
                <button onClick={() => void signOut()} aria-label="Sign out"
                  className="p-1.5 rounded text-ink-3 hover:bg-subtle hover:text-ink-1">
                  <LogOut size={14} />
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
