"use client"

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react"
import { useWebContainer } from "./use-webcontainer"

interface FileNode {
    name: string
    path: string
    type: 'file' | 'directory'
    children?: FileNode[]
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
    templateId: string
}

export function BCoderProvider({ children, templateId }: BCoderProviderProps) {
    const webContainer = useWebContainer(templateId)
    const [fileStructure, setFileStructure] = useState<FileNode[]>([])
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>("src/App.jsx")

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
    }

    return (
        <BCoderContext.Provider value={value}>
            {children}
        </BCoderContext.Provider>
    )
}
