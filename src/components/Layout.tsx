import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { IconBody, IconDumbbell, IconList, IconRoutine, IconSettings } from './Icons';

interface NavItem {
  to: string;
  label: string;
  icon: (p: { className?: string }) => ReactNode;
  end?: boolean;
}

// Etapa 1: solo las secciones que ya existen. "Hoy" y "Progreso" se suman después.
const NAV: NavItem[] = [
  { to: '/', label: 'Cuerpo', icon: IconBody, end: true },
  { to: '/ejercicios', label: 'Ejercicios', icon: IconList },
  { to: '/rutinas', label: 'Rutinas', icon: IconRoutine },
  { to: '/ajustes', label: 'Ajustes', icon: IconSettings },
];

export function Layout() {
  return (
    <div className="flex min-h-full">
      {/* Barra lateral en tablet */}
      <aside
        className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-2 border-r border-line/60 bg-surface/60 px-3 md:flex lg:w-64"
        style={{ paddingTop: 'calc(var(--safe-top) + 20px)', paddingLeft: 'calc(var(--safe-left) + 12px)' }}
      >
        <div className="mb-6 flex items-center gap-2 px-3 text-lg font-bold">
          <IconDumbbell className="text-accent" />
          Mancuernas
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-[17px] font-semibold transition ${
                isActive ? 'bg-accentSoft text-ink' : 'text-muted hover:bg-surface2'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <n.icon className={isActive ? 'text-accent' : ''} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </aside>

      <main className="with-bottom-nav min-w-0 flex-1" style={{ paddingRight: 'var(--safe-right)' }}>
        <Outlet />
      </main>

      {/* Barra inferior en celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)', paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)' }}
      >
        <div className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch justify-around">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 text-[13px] font-semibold ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <n.icon />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
