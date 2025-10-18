import { create } from 'zustand'

interface HeaderState {
  title: string
  subtitle?: string
  isThreadActive: boolean
  onShare?: () => void
  setTitle: (title: string, subtitle?: string) => void
  setThreadActive: (isActive: boolean, onShare?: () => void) => void
  reset: () => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: '',
  subtitle: undefined,
  isThreadActive: false,
  onShare: undefined,
  setTitle: (title: string, subtitle?: string) => set({ title, subtitle }),
  setThreadActive: (isActive: boolean, onShare?: () => void) => 
    set({ isThreadActive: isActive, onShare }),
  reset: () => set({ 
    title: '', 
    subtitle: undefined, 
    isThreadActive: false,
    onShare: undefined 
  }),
}))

