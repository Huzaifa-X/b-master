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
  prefilledPrompt: string | null;
  /** outerHTML of the element the user clicked in visual-edit mode. When set,
   *  the chatbot performs a surgical patch instead of full regeneration. */
  surgicalEditOuterHtml: string | null;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setArtifact: (content: ArtifactContent) => void;
  clearArtifact: () => void;
  togglePreview: () => void;
  setPreviewMode: (mode: boolean) => void;
  setPrefilledPrompt: (text: string | null) => void;
  setSurgicalEditOuterHtml: (html: string | null) => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  isPanelOpen: false,
  artifactContent: null,
  isPreviewMode: false,
  prefilledPrompt: null,
  surgicalEditOuterHtml: null,
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
  setPrefilledPrompt: (text) => set({ prefilledPrompt: text }),
  setSurgicalEditOuterHtml: (html) => set({ surgicalEditOuterHtml: html }),
}));

