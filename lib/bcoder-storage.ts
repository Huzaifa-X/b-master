/**
 * B-Coder Workspace Persistence
 *
 * Stores workspace files in localStorage to persist changes across page reloads.
 * Each template has its own storage key to keep workspaces separate.
 */

const STORAGE_PREFIX = 'bcoder-workspace-'
const STORAGE_VERSION = 2

interface StoredWorkspace {
  version: number
  templateId: string
  files: { [path: string]: string }
  savedAt: number
}

/**
 * Get the localStorage key for a given template
 */
function getStorageKey(templateId: string): string {
  return `${STORAGE_PREFIX}${templateId}`
}

/**
 * Save workspace files to localStorage
 */
export function saveWorkspaceToStorage(templateId: string, files: { [path: string]: string }): boolean {
  try {
    const workspace: StoredWorkspace = {
      version: STORAGE_VERSION,
      templateId,
      files,
      savedAt: Date.now()
    }

    const serialized = JSON.stringify(workspace)

    // Check if we're within localStorage limits (~5MB)
    if (serialized.length > 4 * 1024 * 1024) { // 4MB safety limit
      console.warn('[BCoder Storage] Workspace too large to save to localStorage')
      return false
    }

    localStorage.setItem(getStorageKey(templateId), serialized)
    console.log(`[BCoder Storage] Saved workspace for ${templateId} (${Object.keys(files).length} files)`)
    return true
  } catch (error) {
    console.error('[BCoder Storage] Failed to save workspace:', error)
    return false
  }
}

/**
 * Load workspace files from localStorage
 */
export function loadWorkspaceFromStorage(templateId: string): { [path: string]: string } | null {
  try {
    const stored = localStorage.getItem(getStorageKey(templateId))
    if (!stored) {
      return null
    }

    const workspace: StoredWorkspace = JSON.parse(stored)

    // Version check for future migrations
    if (workspace.version !== STORAGE_VERSION) {
      console.warn('[BCoder Storage] Workspace version mismatch, ignoring stored data')
      return null
    }

    // Validate the stored data
    if (!workspace.files || typeof workspace.files !== 'object') {
      console.warn('[BCoder Storage] Invalid workspace data')
      return null
    }

    const savedDate = new Date(workspace.savedAt).toLocaleString()
    console.log(`[BCoder Storage] Loaded workspace for ${templateId} (saved: ${savedDate}, ${Object.keys(workspace.files).length} files)`)

    return workspace.files
  } catch (error) {
    console.error('[BCoder Storage] Failed to load workspace:', error)
    return null
  }
}

/**
 * Check if a workspace exists in storage
 */
export function hasStoredWorkspace(templateId: string): boolean {
  try {
    return localStorage.getItem(getStorageKey(templateId)) !== null
  } catch {
    return false
  }
}

/**
 * Clear a specific workspace from storage
 */
export function clearWorkspaceStorage(templateId: string): boolean {
  try {
    localStorage.removeItem(getStorageKey(templateId))
    console.log(`[BCoder Storage] Cleared workspace for ${templateId}`)
    return true
  } catch (error) {
    console.error('[BCoder Storage] Failed to clear workspace:', error)
    return false
  }
}

/**
 * Get metadata about a stored workspace without loading all files
 */
export function getWorkspaceMetadata(templateId: string): { savedAt: Date, fileCount: number } | null {
  try {
    const stored = localStorage.getItem(getStorageKey(templateId))
    if (!stored) return null

    const workspace: StoredWorkspace = JSON.parse(stored)
    return {
      savedAt: new Date(workspace.savedAt),
      fileCount: Object.keys(workspace.files).length
    }
  } catch {
    return null
  }
}

// ─── Chat History Persistence ───────────────────────────────────────────────

const CHAT_STORAGE_PREFIX = 'bcoder-chat-'
const CHAT_VERSION = 1

/** Strip boltArtifact/boltAction XML from assistant message content before saving */
function stripBoltXml(content: string): string {
  return content
    .replace(/<boltArtifact[^>]*>[\s\S]*?<\/boltArtifact>/g, '')
    .replace(/<boltArtifact[^>]*>[\s\S]*/g, '')
    .replace(/<boltAction[^>]*>[\s\S]*?<\/boltAction>/g, '')
    .replace(/<boltAction[^>]*>[\s\S]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Save chat history (DisplayMessage[]) to localStorage.
 * - Strips boltArtifact XML from assistant messages to stay within size limits
 * - Converts pending plans to approved (they already ran)
 * - Converts pending/fixing bug alerts to dismissed (stale after reload)
 */
export function saveChatHistory(storageKey: string, messages: any[]): boolean {
  try {
    const normalized = messages
      .map((m: any) => {
        if (m.kind === 'assistant') {
          const stripped = stripBoltXml(m.content || '')
          return stripped ? { ...m, content: stripped } : null
        }
        if (m.kind === 'plan' && m.status === 'pending') {
          return { ...m, status: 'approved' }
        }
        if (m.kind === 'bug_alert' && (m.status === 'pending' || m.status === 'fixing')) {
          return { ...m, status: 'dismissed' }
        }
        return m
      })
      .filter(Boolean)

    const payload = JSON.stringify({ version: CHAT_VERSION, messages: normalized, savedAt: Date.now() })

    // If over 900KB keep only the last 50 messages
    const final = payload.length > 900 * 1024
      ? JSON.stringify({ version: CHAT_VERSION, messages: normalized.slice(-50), savedAt: Date.now() })
      : payload

    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${storageKey}`, final)
    return true
  } catch (err) {
    console.error('[BCoder Chat Storage] Failed to save:', err)
    return false
  }
}

/**
 * Load persisted chat history from localStorage.
 * Returns null if nothing is stored or the data is invalid/stale.
 */
export function loadChatHistory(storageKey: string): any[] | null {
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${storageKey}`)
    if (!stored) return null
    const data = JSON.parse(stored)
    if (data.version !== CHAT_VERSION || !Array.isArray(data.messages)) return null
    return data.messages as any[]
  } catch {
    return null
  }
}

/** Remove chat history for a given storage key */
export function clearChatHistory(storageKey: string): void {
  try {
    localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${storageKey}`)
  } catch {
    // ignore
  }
}

/**
 * List all stored workspace template IDs
 */
export function listStoredWorkspaces(): string[] {
  const workspaces: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        workspaces.push(key.replace(STORAGE_PREFIX, ''))
      }
    }
  } catch {
    // Ignore errors
  }
  return workspaces
}
