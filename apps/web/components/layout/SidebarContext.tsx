'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const EXPANDED_WIDTH = 237;
const COLLAPSED_WIDTH = 68;
const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  width: number;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  width: EXPANDED_WIDTH,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, width }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
