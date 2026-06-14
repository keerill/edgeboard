"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";

// One shared transition for a whole page's filter controls. Every `FilterPills`
// / `SearchForm` triggers navigation through this provider's `startTransition`,
// and every `PendingRegion` reads the same `isPending` — so any filter change
// dims the data regions with a single source of truth.
type FilterContextValue = {
  isPending: boolean;
  startTransition: (cb: () => void) => void;
};

// Safe default: used outside a provider, controls still navigate (the callback
// runs synchronously) instead of throwing. `isPending` simply stays false.
const FilterContext = createContext<FilterContextValue>({
  isPending: false,
  startTransition: (cb: () => void) => cb(),
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <FilterContext.Provider value={{ isPending, startTransition }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext(): FilterContextValue {
  return useContext(FilterContext);
}
