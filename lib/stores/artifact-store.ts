"use client";

import { create } from "zustand";

export interface ArtifactContent {
  type: "code" | "markdown" | "component";
  language?: string;
  content: string;
  title?: string;
}

interface ArtifactStore {
  isPanelOpen: boolean;
  artifactContent: ArtifactContent | null;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setArtifact: (content: ArtifactContent) => void;
  clearArtifact: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  isPanelOpen: false,
  artifactContent: null,
  togglePanel: () => set((state) => {
    // If closing and no content, just close
    // If opening and has content, open
    // If opening and no content, stay closed
    if (state.isPanelOpen) {
      return { isPanelOpen: false };
    } else if (state.artifactContent) {
      return { isPanelOpen: true };
    }
    return state; // No change if no content and trying to open
  }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }), // Don't clear content on close
  setArtifact: (content) => set({ artifactContent: content, isPanelOpen: true }),
  clearArtifact: () => set({ artifactContent: null }),
}));

