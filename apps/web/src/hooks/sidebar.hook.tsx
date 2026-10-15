import { use, type FC } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SidebarContext } from "@components/layout/Sidebar";

export const useSidebarSafebox = () => {
  const { open, isMobile, animationDuration } = use(SidebarContext);

  const Safebox: FC = () => {
    return (
      <>
        <AnimatePresence>
          {!open && !isMobile && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 64, transition: { delay: animationDuration } }}
              exit={{ height: 0 }}
            />
          )}
        </AnimatePresence>
      </>
    );
  };

  return { Safebox };
};
