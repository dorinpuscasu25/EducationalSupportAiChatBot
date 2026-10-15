import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { IconContext } from "react-icons";
import { createAppRouter } from "./router";

import "./index.css";

const queryClient = new QueryClient();

const router = createAppRouter(queryClient);

export function Core() {
  return (
    <QueryClientProvider client={queryClient}>
      <IconContext.Provider value={{ className: "text-base" }}>
        <RouterProvider router={router} />
      </IconContext.Provider>
    </QueryClientProvider>
  );
}
