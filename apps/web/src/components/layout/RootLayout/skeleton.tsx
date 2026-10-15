import { Sidebar } from "@components/layout/Sidebar";
import type { FC, ReactNode } from "react";

export const RootLayoutSkeleton: FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <Sidebar.Root>
      <Sidebar.Panel>
        <Sidebar.PanelHeader>
          <div className="mr-10 flex flex-1 animate-pulse flex-col gap-4">
            <div className="bg-foreground h-8 w-full rounded-lg" />
          </div>
        </Sidebar.PanelHeader>
        <Sidebar.PanelContent>
          <div className="mt-10 flex animate-pulse flex-col gap-4">
            <div className="bg-foreground h-4 w-full rounded-lg"></div>
            <div className="bg-foreground h-4 w-full rounded-lg"></div>
            <div className="bg-foreground h-4 w-full rounded-lg"></div>
            <div className="bg-foreground h-4 w-full rounded-lg"></div>
          </div>
        </Sidebar.PanelContent>
        <Sidebar.PanelFooter>
          <div className="flex flex-1 animate-pulse flex-col gap-4">
            <div className="bg-foreground h-8 w-full rounded-lg" />
          </div>
        </Sidebar.PanelFooter>
      </Sidebar.Panel>
      <Sidebar.Content>{children}</Sidebar.Content>
    </Sidebar.Root>
  );
};
