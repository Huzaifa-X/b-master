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
  isEditMode: boolean; // New: whether the user is editing the code
  isFullscreen: boolean; // Fullscreen mode for artifact panel
  prefilledPrompt: string | null;
  /** outerHTML of the element the user clicked in visual-edit mode. When set,
   *  the chatbot performs a surgical patch instead of full regeneration. */
  surgicalEditOuterHtml: string | null;
  // Intent-aware workflow state
  detectedIntent: string | null;
  wasAutoOpened: boolean;
  previousChatLayout: number[] | null;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setArtifact: (content: ArtifactContent) => void;
  updateArtifactContent: (content: string) => void; // New: update content in place
  clearArtifact: () => void;
  togglePreview: () => void;
  setPreviewMode: (mode: boolean) => void;
  toggleEditMode: () => void; // New: toggle edit mode
  setEditMode: (mode: boolean) => void; // New: set edit mode
  toggleFullscreen: () => void; // Toggle fullscreen mode
  setFullscreen: (fullscreen: boolean) => void; // Set fullscreen mode
  setPrefilledPrompt: (text: string | null) => void;
  setSurgicalEditOuterHtml: (html: string | null) => void;
  // Intent-aware workflow methods
  setDetectedIntent: (intent: string | null) => void;
  setAutoOpened: (wasAuto: boolean, previousLayout?: number[]) => void;
  restoreFromAutoOpen: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  isPanelOpen: false,
  artifactContent: null,
  isPreviewMode: false,
  isEditMode: false,
  isFullscreen: false,
  prefilledPrompt: null,
  surgicalEditOuterHtml: null,
  // Intent-aware workflow state
  detectedIntent: null,
  wasAutoOpened: false,
  previousChatLayout: null,
  togglePanel: () => set((state) => {
    // If closing and no content, just close
    // If opening and has content, open
    // If opening and no content, stay closed
    if (state.isPanelOpen) {
      return { isPanelOpen: false, isEditMode: false };
    } else if (state.artifactContent) {
      return { isPanelOpen: true };
    }
    return state; // No change if no content and trying to open
  }),
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false, isPreviewMode: false, isEditMode: false, isFullscreen: false, wasAutoOpened: false, previousChatLayout: null, detectedIntent: null }), // Reset modes on close
  setArtifact: (content) => set({ artifactContent: content, isPanelOpen: true, isEditMode: false, isPreviewMode: true }),
  updateArtifactContent: (content) => set((state) => ({
    artifactContent: state.artifactContent
      ? { ...state.artifactContent, content }
      : null
  })),
  clearArtifact: () => set({ artifactContent: null, isEditMode: false }),
  togglePreview: () => set((state) => ({ isPreviewMode: !state.isPreviewMode, isEditMode: false })),
  setPreviewMode: (mode) => set({ isPreviewMode: mode, isEditMode: false }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode, isPreviewMode: false })),
  setEditMode: (mode) => set({ isEditMode: mode, isPreviewMode: false }),
  setPrefilledPrompt: (text) => set({ prefilledPrompt: text }),
  setSurgicalEditOuterHtml: (html) => set({ surgicalEditOuterHtml: html }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  // Intent-aware workflow methods
  setDetectedIntent: (intent) => set({ detectedIntent: intent }),
  setAutoOpened: (wasAuto, previousLayout) => set({
    wasAutoOpened: wasAuto,
    previousChatLayout: previousLayout || null
  }),
  restoreFromAutoOpen: () => set({
    isFullscreen: false,
    wasAutoOpened: false,
    previousChatLayout: null,
    detectedIntent: null
  }),
}));

