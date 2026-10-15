import { createContext, use, useState, type FC, type ReactNode } from "react";
import { LuChartNoAxesGantt, LuPanelLeft, LuPanelRight } from "react-icons/lu";
import {
  AnimatePresence,
  motion,
  type TargetAndTransition,
} from "motion/react";
import { useMedia } from "@hooks/core.hooks";
import { twMerge } from "tailwind-merge";
import { useSidebarSafebox } from "@hooks/sidebar.hook";

const animationDuration = 0.2;

type Props = {
  children: React.ReactNode;
};

export const SidebarContext = createContext<{
  open: boolean;
  isMobile: boolean;
  animationDuration: number;
  setOpen: (value: boolean) => void;
}>({
  open: false,
  isMobile: false,
  animationDuration,
  setOpen: () => {},
});

const Root: FC<Props> = ({ children }) => {
  const { isMobile } = useMedia();
  const [open, setOpen] = useState(!isMobile);

  const handleSidebarToggle = (value: boolean) => {
    if (!value) {
      document.body.style.overflow = "initial";
      setOpen(value);

      return;
    }

    document.body.style.overflow = "hidden";
    setOpen(value);
  };

  return (
    <SidebarContext.Provider
      value={{
        open,
        isMobile,
        animationDuration,
        setOpen: handleSidebarToggle,
      }}
    >
      <div className="flex h-dvh">
        <div
          className={twMerge(
            "bg-background-dark/50 pointer-events-none fixed inset-0 z-40 size-full opacity-0 transition-opacity duration-200 select-none",
            isMobile && open && "pointer-events-auto opacity-100",
          )}
          onClick={() => setOpen(false)}
        />
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

const Panel: FC<Props> = ({ children }) => {
  const { isMobile, open } = use(SidebarContext);

  const animationVariants: {
    initial: TargetAndTransition;
    animate: TargetAndTransition;
    exit: TargetAndTransition;
  } = isMobile
    ? {
        initial: { translateX: "-100%" },
        animate: { translateX: 0, width: "100%" },
        exit: { translateX: "-100%" },
      }
    : { initial: { width: 0 }, animate: { width: "auto" }, exit: { width: 0 } };

  return (
    <AnimatePresence initial={isMobile}>
      {open && (
        <motion.div
          className={twMerge(
            "bg-background-dark/70 border-border h-full max-w-96 border-r backdrop-blur-sm md:w-auto",
            isMobile && "fixed z-50",
          )}
          initial={animationVariants.initial}
          animate={animationVariants.animate}
          exit={animationVariants.exit}
          transition={{ ease: "easeInOut", duration: animationDuration }}
        >
          <div className="flex h-full w-full shrink-0 flex-col px-4 pt-5 md:w-72">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PanelHeader: FC<{ children?: ReactNode }> = ({ children }) => {
  const { setOpen } = use(SidebarContext);

  return (
    <div className="mt-4 mb-4 flex items-center justify-between">
      {children}
      <button
        type="button"
        aria-label="Restrânge navigarea"
        onClick={() => setOpen(false)}
        className="text-muted hover:bg-pop hover:text-primary ml-auto rounded-lg p-2"
      >
        <LuPanelLeft className="size-4" />
      </button>
    </div>
  );
};

const PanelContent: FC<Props> = ({ children }) => {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">{children}</div>
  );
};

const PanelFooter: FC<Props> = ({ children }) => {
  return <div className="mt-auto py-6">{children}</div>;
};

const Content: FC<Props> = ({ children }) => {
  const { open, isMobile, setOpen } = use(SidebarContext);
  const { Safebox } = useSidebarSafebox();

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <Safebox />

      <div className="relative flex min-h-0 flex-1 overflow-y-auto px-4 pt-20 md:px-8 xl:px-12 xl:pt-6">
        <AnimatePresence initial={false}>
          {!open && (
            <motion.button
              type="button"
              aria-label="Deschide navigarea"
              className="border-border bg-background fixed top-4 left-4 z-30 cursor-pointer rounded-xl border p-3"
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0 }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { delay: animationDuration },
                },
                exit: { opacity: 0 },
              }}
              onClick={() => setOpen(true)}
            >
              {isMobile ? (
                <LuChartNoAxesGantt className="size-6" />
              ) : (
                <LuPanelRight className="size-5" />
              )}
            </motion.button>
          )}
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
};

export const Sidebar = {
  Root,
  Panel,
  PanelFooter,
  PanelHeader,
  PanelContent,
  Content,
};
