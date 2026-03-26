"use client"

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react"
import { useWebContainer } from "./use-webcontainer"

interface FileNode {
    name: string
    path: string
    type: 'file' | 'directory'
    children?: FileNode[]
}

interface FileVersion {
    content: string
    timestamp: number
}

interface FileHistory {
    [path: string]: FileVersion[]
}

interface BCoderContextValue {
    isBooting: boolean
    isInstalling: boolean
    isServerReady: boolean
    serverUrl: string | null
    error: string | null
    webcontainerInstance: any | null
    createFile: (path: string, content?: string) => Promise<void>
    deleteFile: (path: string) => Promise<void>
    renameFile: (oldPath: string, newPath: string) => Promise<void>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
    createFolder: (path: string) => Promise<void>
    deleteFolder: (path: string) => Promise<void>
    runCommand: (commandString: string) => Promise<void>
    exportFilesAsJson: () => Promise<{ [path: string]: string }>
    buildFileTree: () => Promise<void>
    fileStructure: FileNode[]
    selectedFilePath: string | null
    setSelectedFilePath: (path: string | null) => void
    getCurrentFileContent: () => Promise<string | null>
    activeArtifact: { id: string, name: string, instructions: string, category: string } | null
    setActiveArtifact: (artifact: { id: string, name: string, instructions: string, category: string } | null) => void
    // Workspace persistence
    saveWorkspace: () => Promise<boolean>
    resetWorkspace: () => Promise<void>
    retrySetup: () => Promise<void>
    hasStoredChanges: boolean
    // Bug detection
    detectedError: string | null
    clearDetectedError: () => void
    // Smart Rollback
    fileHistory: FileHistory
    pushFileVersion: (path: string, content: string) => void
    rollbackFile: (path: string) => Promise<boolean>
    rollbackAllFiles: () => Promise<boolean>
    getFileVersionCount: (path: string) => number
    clearFileHistory: () => void
}

const BCoderContext = createContext<BCoderContextValue | null>(null)

export function useBCoderContext() {
    const context = useContext(BCoderContext)
    if (!context) {
        throw new Error("useBCoderContext must be used within BCoderProvider")
    }
    return context
}

interface BCoderProviderProps {
    children: ReactNode
    assistantId: string
    templateId: string
    projectId?: string
}

export function BCoderProvider({ children, assistantId, templateId, projectId }: BCoderProviderProps) {
    const webContainer = useWebContainer(assistantId, templateId, projectId)
    const [fileStructure, setFileStructure] = useState<FileNode[]>([])
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>("src/App.jsx")
    const [activeArtifact, setActiveArtifact] = useState<{ id: string, name: string, instructions: string, category: string } | null>(null)
    const [fileHistory, setFileHistory] = useState<FileHistory>({})

    const buildFileTree = useCallback(async () => {
        if (!webContainer.webcontainerInstance) return

        try {
            const readDir = async (path: string): Promise<FileNode[]> => {
                const entries = await webContainer.webcontainerInstance!.fs.readdir(path, { withFileTypes: true })
                const nodes: FileNode[] = []

                for (const entry of entries) {
                    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
                        continue
                    }

                    const fullPath = path === '.' ? entry.name : `${path}/${entry.name}`

                    if (entry.isDirectory()) {
                        const children = await readDir(fullPath)
                        nodes.push({ name: entry.name, path: fullPath, type: 'directory', children })
                    } else {
                        nodes.push({ name: entry.name, path: fullPath, type: 'file' })
                    }
                }

                return nodes.sort((a, b) => {
                    if (a.type === b.type) return a.name.localeCompare(b.name)
                    return a.type === 'directory' ? -1 : 1
                })
            }

            const tree = await readDir('.')
            setFileStructure(tree)
        } catch {
            // Silently handle errors
        }
    }, [webContainer.webcontainerInstance])

    // Smart Rollback: Push a version to history before modifying
    const pushFileVersion = useCallback((path: string, content: string) => {
        setFileHistory(prev => {
            const versions = prev[path] || []
            // Limit history to last 10 versions per file
            const newVersions = [...versions, { content, timestamp: Date.now() }].slice(-10)
            return { ...prev, [path]: newVersions }
        })
    }, [])

    // Smart Rollback: Restore file to previous version
    const rollbackFile = useCallback(async (path: string): Promise<boolean> => {
        const versions = fileHistory[path]
        if (!versions || versions.length === 0) return false

        try {
            // Get the last saved version
            const lastVersion = versions[versions.length - 1]
            await webContainer.writeFile(path, lastVersion.content)

            // Remove the used version from history
            setFileHistory(prev => {
                const newVersions = [...(prev[path] || [])]
                newVersions.pop()
                return { ...prev, [path]: newVersions }
            })

            await buildFileTree()
            return true
        } catch {
            return false
        }
    }, [fileHistory, webContainer, buildFileTree])

    // Smart Rollback: Rollback all recently modified files
    const rollbackAllFiles = useCallback(async (): Promise<boolean> => {
        const paths = Object.keys(fileHistory).filter(path => fileHistory[path].length > 0)
        if (paths.length === 0) return false

        try {
            for (const path of paths) {
                await rollbackFile(path)
            }
            return true
        } catch {
            return false
        }
    }, [fileHistory, rollbackFile])

    // Get version count for a file
    const getFileVersionCount = useCallback((path: string): number => {
        return fileHistory[path]?.length || 0
    }, [fileHistory])

    // Clear all file history
    const clearFileHistory = useCallback(() => {
        setFileHistory({})
    }, [])

    const getCurrentFileContent = useCallback(async (): Promise<string | null> => {
        if (!selectedFilePath || !webContainer.webcontainerInstance) return null
        try {
            return await webContainer.readFile(selectedFilePath)
        } catch {
            return null
        }
    }, [selectedFilePath, webContainer])

    useEffect(() => {
        if (webContainer.isServerReady) {
            buildFileTree()
        }
    }, [webContainer.isServerReady, buildFileTree])

    const value: BCoderContextValue = {
        ...webContainer,
        fileStructure,
        buildFileTree,
        selectedFilePath,
        setSelectedFilePath,
        getCurrentFileContent,
        activeArtifact,
        setActiveArtifact,
        // Smart Rollback
        fileHistory,
        pushFileVersion,
        rollbackFile,
        rollbackAllFiles,
        getFileVersionCount,
        clearFileHistory
    }

    return (
        <BCoderContext.Provider value={value}>
            {children}
        </BCoderContext.Provider>
    )
}
