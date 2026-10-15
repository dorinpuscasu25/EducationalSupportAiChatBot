import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * A QueryClient for one test. React Query's default `retry: 3` would make a
 * test of a failing query wait out the retries, so it is off.
 */
export function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** RTL's render inside the providers every component here expects. */
function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = testQueryClient(),
    ...options
  }: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...rtlRender(ui, { wrapper: Wrapper, ...options }), queryClient };
}

export * from "@testing-library/react";
// An explicit export wins over the `export *` above.
export { renderWithProviders as render };
