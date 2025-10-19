import { create } from 'zustand'

interface AssistantState {
  isAssistantMode: boolean
  currentAssistantId: string | null
  assistantName: string | null
  setAssistantMode: (id: string, name?: string) => void
  clearAssistantMode: () => void
}

export const useAssistantStore = create<AssistantState>((set) => ({
  isAssistantMode: false,
  currentAssistantId: null,
  assistantName: null,
  setAssistantMode: (id: string, name?: string) => 
    set({ 
      isAssistantMode: true, 
      currentAssistantId: id,
      assistantName: name || null 
    }),
  clearAssistantMode: () => 
    set({ 
      isAssistantMode: false, 
      currentAssistantId: null,
      assistantName: null 
    }),
}))

