import { useMediaQuery } from "react-responsive";

export const useMedia = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 1279px)" });

  return { isMobile };
};
