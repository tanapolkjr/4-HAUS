import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-page mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
