import { create } from "zustand"
import { persist } from "zustand/middleware"

interface StoreCycle {
  id: string
  name: string
  status: string
  phase1Opens: string
  q1Opens: string
  q2Opens: string
  q3Opens: string
  q4Opens: string
}

interface AppState {
  sidebarOpen: boolean
  currentCycle: StoreCycle | null
  escalationCount: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setCurrentCycle: (cycle: StoreCycle | null) => void
  setEscalationCount: (count: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      currentCycle: null,
      escalationCount: 0,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setCurrentCycle: (cycle) => set({ currentCycle: cycle }),
      setEscalationCount: (count) => set({ escalationCount: count }),
    }),
    {
      name: "atomquest-app",
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
