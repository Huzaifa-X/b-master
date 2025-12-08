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
  isPreviewMode: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setArtifact: (content: ArtifactContent) => void;
  clearArtifact: () => void;
  togglePreview: () => void;
  setPreviewMode: (mode: boolean) => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  isPanelOpen: false,
  artifactContent: null,
  isPreviewMode: false,
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
  closePanel: () => set({ isPanelOpen: false, isPreviewMode: false }), // Reset preview mode on close
  setArtifact: (content) => set({ artifactContent: content, isPanelOpen: true }),
  clearArtifact: () => set({ artifactContent: null }),
  togglePreview: () => set((state) => ({ isPreviewMode: !state.isPreviewMode })),
  setPreviewMode: (mode) => set({ isPreviewMode: mode }),
}));

