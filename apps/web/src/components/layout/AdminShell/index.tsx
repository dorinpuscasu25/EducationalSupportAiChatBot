import type { FC, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LuLayoutDashboard,
  LuUsers,
  LuArrowLeft,
  LuLibrary,
  LuSettings,
  LuGraduationCap,
} from "react-icons/lu";
import { AdminRoutes, HomeRoute } from "@config/routes";

const NAV = [
  {
    to: AdminRoutes.Overview,
    label: "Prezentare",
    icon: LuLayoutDashboard,
    exact: true,
  },
  { to: AdminRoutes.Users, label: "Users", icon: LuUsers, exact: false },
  {
    to: AdminRoutes.Knowledge,
    label: "Documente",
    icon: LuLibrary,
    exact: false,
  },
  {
    to: AdminRoutes.Settings,
    label: "Setări",
    icon: LuSettings,
    exact: false,
  },
] as const;

export const AdminShell: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="bg-background/40 text-primary flex h-dvh">
    <aside className="border-border bg-pop/20 flex w-60 shrink-0 flex-col border-r">
      <div className="border-border flex items-center gap-2 border-b px-5 py-4">
        <div className="bg-dim/20 text-highlight flex size-7 items-center justify-center rounded-md">
          <LuGraduationCap className="size-4" />
        </div>
        <div className="font-semibold">Admin</div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="text-muted hover:bg-pop/40 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            activeProps={{
              className: "bg-pop/60 text-primary",
            }}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-border border-t p-3">
        <Link
          to={HomeRoute}
          search={{ chatId: undefined }}
          className="text-muted hover:text-primary flex items-center gap-2 px-3 py-2 text-sm"
        >
          <LuArrowLeft className="size-4" />
          Înapoi la platformă
        </Link>
      </div>
    </aside>

    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
);
