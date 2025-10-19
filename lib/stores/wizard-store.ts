import { create } from 'zustand'

interface WizardState {
  currentStep: number
  completedSteps: number[]
  setCurrentStep: (step: number) => void
  addCompletedStep: (step: number) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>((set) => ({
  currentStep: 1,
  completedSteps: [],
  setCurrentStep: (step: number) => set({ currentStep: step }),
  addCompletedStep: (step: number) => 
    set((state) => ({ 
      completedSteps: state.completedSteps.includes(step) 
        ? state.completedSteps 
        : [...state.completedSteps, step] 
    })),
  reset: () => set({ currentStep: 1, completedSteps: [] }),
}))

