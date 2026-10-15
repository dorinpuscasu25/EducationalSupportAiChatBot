import type { FC, ReactNode } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { Link } from "@components/core/Link";
import { Sidebar } from "@components/layout/Sidebar";
import { HomeRoute } from "@config/routes";
import { APP_NAME } from "@config/brand";

export { UserFooter } from "./UserFooter";

type Props = {
  children?: ReactNode;
  /** Navigation inside the panel (RootSidebar). */
  sidebar: ReactNode;
  /** Account block at the bottom of the panel (UserFooter). */
  footer: ReactNode;
};

export const RootLayout: FC<Props> = ({ children, sidebar, footer }) => (
  <Sidebar.Root>
    <Sidebar.Panel>
      <Sidebar.PanelHeader>
        <Link
          to={HomeRoute}
          search={{ chatId: undefined }}
          className="text-primary flex items-center text-xl font-bold"
        >
          <LuGraduationCap className="text-accent border-dim/40 mr-3 size-8 shrink-0 rounded-lg border p-1.5" />
          <span className="truncate text-lg">{APP_NAME}</span>
        </Link>
      </Sidebar.PanelHeader>
      <Sidebar.PanelContent>{sidebar}</Sidebar.PanelContent>
      <Sidebar.PanelFooter>{footer}</Sidebar.PanelFooter>
    </Sidebar.Panel>
    <Sidebar.Content>{children}</Sidebar.Content>
  </Sidebar.Root>
);
