"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import { getTemplateById } from "@/lib/templates"
import {
    saveWorkspaceToStorage,
    loadWorkspaceFromStorage,
    clearWorkspaceStorage,
    hasStoredWorkspace
} from "@/lib/bcoder-storage"

interface UseWebContainerReturn {
    isBooting: boolean
    isInstalling: boolean
    isServerReady: boolean
    serverUrl: string | null
    terminalOutput: string[]
    error: string | null
    writeFile: (path: string, content: string) => Promise<void>
    webcontainerInstance: WebContainer | null
    createFile: (path: string, content?: string) => Promise<void>
    deleteFile: (path: string) => Promise<void>
    renameFile: (oldPath: string, newPath: string) => Promise<void>
    readFile: (path: string) => Promise<string>
    createFolder: (path: string) => Promise<void>
    deleteFolder: (path: string) => Promise<void>
    runCommand: (commandString: string) => Promise<void>
    exportFilesAsJson: () => Promise<{ [path: string]: string }>
    saveWorkspace: () => Promise<boolean>
    resetWorkspace: () => Promise<void>
    hasStoredChanges: boolean
}

let globalWebContainerPromise: Promise<WebContainer> | null = null

export function useWebContainer(assistantId: string, templateId: string): UseWebContainerReturn {
    // Create a unique storage key combining assistantId and templateId
    // This allows each assistant to have its own saved workspace per template
    const storageKey = `${assistantId}-${templateId}`

    const [isBooting, setIsBooting] = useState(true)
    const [isInstalling, setIsInstalling] = useState(false)
    const [isServerReady, setIsServerReady] = useState(false)
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [terminalOutput, setTerminalOutput] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null)
    const [hasStoredChanges, setHasStoredChanges] = useState(() => hasStoredWorkspace(storageKey))

    const webcontainerInstanceRef = useRef<WebContainer | null>(null)
    const devServerProcessRef = useRef<any | null>(null)
    const isBootingRef = useRef(false)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const storageKeyRef = useRef(storageKey)
    const templateIdRef = useRef(templateId)

    const addTerminalOutput = useCallback((message: string) => {
        setTerminalOutput((prev) => [...prev, message])
    }, [])

    // Debounced auto-save function
    const scheduleSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(async () => {
            if (!webcontainerInstanceRef.current) return
            try {
                const files = await exportFilesAsJsonInternal(webcontainerInstanceRef.current)
                const success = saveWorkspaceToStorage(storageKeyRef.current, files)
                if (success) {
                    setHasStoredChanges(true)
                }
            } catch (err) {
                console.error('[WebContainer] Failed to auto-save workspace:', err)
            }
        }, 1000) // 1 second debounce
    }, [])

    // Internal function to export files (used by both scheduleSave and exportFilesAsJson)
    const exportFilesAsJsonInternal = async (wc: WebContainer): Promise<{ [path: string]: string }> => {
        const result: { [path: string]: string } = {}

        const readDirRecursive = async (path: string) => {
            const entries = await wc.fs.readdir(path, { withFileTypes: true })

            for (const entry of entries) {
                // Skip node_modules and hidden folders/files to save bandwidth
                if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
                    continue
                }

                const fullPath = path === '.' ? entry.name : `${path}/${entry.name}`

                if (entry.isDirectory()) {
                    await readDirRecursive(fullPath)
                } else {
                    try {
                        const content = await wc.fs.readFile(fullPath, "utf-8")
                        result[fullPath] = content
                    } catch (err) {
                        console.error(`Failed to read file for export: ${fullPath}`, err)
                    }
                }
            }
        }

        await readDirRecursive('.')
        return result
    }

    const writeFile = useCallback(async (path: string, content: string) => {
        if (!webcontainerInstanceRef.current) return
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path
        try {
            const parts = normalizedPath.split('/')
            if (parts.length > 1) {
                const dir = parts.slice(0, -1).join('/')
                await webcontainerInstanceRef.current.fs.mkdir(dir, { recursive: true })
            }
            await webcontainerInstanceRef.current.fs.writeFile(normalizedPath, content)
            scheduleSave() // Auto-save after write
        } catch (err) {
            console.error('[writeFile] Failed to write', normalizedPath, err)
        }
    }, [scheduleSave])

    const createFile = useCallback(async (path: string, content: string = "") => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.writeFile(path, content)
        scheduleSave()
    }, [scheduleSave])

    const deleteFile = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.rm(path)
        scheduleSave()
    }, [scheduleSave])

    const renameFile = useCallback(async (oldPath: string, newPath: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        const content = await webcontainerInstanceRef.current.fs.readFile(oldPath, "utf-8")
        await webcontainerInstanceRef.current.fs.writeFile(newPath, content)
        await webcontainerInstanceRef.current.fs.rm(oldPath)
        scheduleSave()
    }, [scheduleSave])

    const readFile = useCallback(async (path: string): Promise<string> => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        return await webcontainerInstanceRef.current.fs.readFile(path, "utf-8")
    }, [])

    const createFolder = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.mkdir(path, { recursive: true })
        scheduleSave()
    }, [scheduleSave])

    const deleteFolder = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.rm(path, { recursive: true })
        scheduleSave()
    }, [scheduleSave])

    const installDependencies = useCallback(async (webcontainer: WebContainer) => {
        setIsInstalling(true)
        addTerminalOutput("📦 Running npm install...")

        try {
            const installProcess = await webcontainer.spawn("npm", ["install"])
            installProcess.output.pipeTo(new WritableStream({ write(data) { addTerminalOutput(data) } }))
            const exitCode = await installProcess.exit

            if (exitCode !== 0) throw new Error(`npm install failed with exit code ${exitCode}`)

            addTerminalOutput("✅ Dependencies installed!")
            setIsInstalling(false)
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            addTerminalOutput(`❌ Installation failed: ${errorMsg}`)
            setError(errorMsg)
            setIsInstalling(false)
            throw err
        }
    }, [addTerminalOutput])

    const startDevServer = useCallback(async (webcontainer: WebContainer) => {
        // Kill existing dev server if one is running in this component instance
        if (devServerProcessRef.current) {
            devServerProcessRef.current.kill()
            devServerProcessRef.current = null
        }

        addTerminalOutput("🚀 Starting Vite dev server...")
        try {
            const serverProcess = await webcontainer.spawn("npm", ["run", "dev"])
            devServerProcessRef.current = serverProcess

            serverProcess.output.pipeTo(new WritableStream({ write(data) { addTerminalOutput(data) } }))

            webcontainer.on("server-ready", (_port, url) => {
                addTerminalOutput(`🌐 Server ready at ${url}`)
                setServerUrl(url)
                setIsServerReady(true)
            })
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            addTerminalOutput(`❌ Server start failed: ${errorMsg}`)
            setError(errorMsg)
            throw err
        }
    }, [addTerminalOutput])

    const cleanupFileSystem = useCallback(async (webcontainer: WebContainer) => {
        // Only delete the specific files/folders that we mount, so we don't accidentally
        // kill hidden webcontainer files or node_modules
        const itemsToDelete = ['src', 'public', 'package.json', 'vite.config.js', 'index.html']
        for (const item of itemsToDelete) {
            try {
                await webcontainer.fs.rm(item, { recursive: true })
            } catch (err) {
                // Ignore errors if the file/folder doesn't exist
            }
        }
    }, [])

    useEffect(() => {
        // Prevent double booting loop within the same mounted component
        if (isBootingRef.current || webcontainerInstanceRef.current) return

        isBootingRef.current = true

        async function bootWebContainer() {
            try {
                let webcontainer: WebContainer;

                // SINGLETON LOGIC
                if (!globalWebContainerPromise) {
                    addTerminalOutput("⏳ Booting fresh WebContainer instance (this only happens once)...")
                    globalWebContainerPromise = WebContainer.boot()
                    webcontainer = await globalWebContainerPromise
                    addTerminalOutput("✅ Fresh WebContainer booted!")
                } else {
                    addTerminalOutput("🔄 Reusing existing WebContainer instance...")
                    webcontainer = await globalWebContainerPromise
                    addTerminalOutput("✅ Existing WebContainer connected!")

                    addTerminalOutput("🧹 Cleaning up old workspace files...")
                    await cleanupFileSystem(webcontainer)
                }

                webcontainerInstanceRef.current = webcontainer
                setWebcontainerInstance(webcontainer)
                storageKeyRef.current = storageKey
                templateIdRef.current = templateId

                // Check for saved workspace in localStorage first
                const savedFiles = loadWorkspaceFromStorage(storageKey)
                let filesToMount: { [path: string]: string }

                if (savedFiles && Object.keys(savedFiles).length > 0) {
                    addTerminalOutput(`💾 Restoring saved workspace for: ${templateId}`)
                    filesToMount = savedFiles
                    setHasStoredChanges(true)
                } else {
                    addTerminalOutput(`📦 Loading fresh template: ${templateId}`)
                    const template = getTemplateById(templateId)
                    if (!template) throw new Error(`Template not found: ${templateId}`)
                    filesToMount = template.files
                    setHasStoredChanges(false)
                }

                // Convert flat file structure to WebContainer format
                const templateFiles: any = {}
                for (const [path, content] of Object.entries(filesToMount)) {
                    const pathParts = path.split("/").filter(Boolean)
                    let current = templateFiles

                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const part = pathParts[i]
                        if (!current[part]) current[part] = { directory: {} }
                        current = current[part].directory
                    }

                    const fileName = pathParts[pathParts.length - 1]
                    current[fileName] = { file: { contents: content } }
                }

                addTerminalOutput("📁 Mounting template files...")
                await webcontainer.mount(templateFiles)
                addTerminalOutput("✅ Files mounted!")

                setIsBooting(false)
                await installDependencies(webcontainer)
                await startDevServer(webcontainer)
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                addTerminalOutput(`❌ Boot failed: ${errorMsg}`)
                setError(errorMsg)
                setIsBooting(false)
            }
        }

        bootWebContainer()

        // Clean up when this specific hook unmounts (e.g. modal is closed)
        return () => {
            isBootingRef.current = false
            setIsServerReady(false)
            setServerUrl(null)

            // Kill ONLY the dev server process, do NOT tear down the webcontainer 
            if (devServerProcessRef.current) {
                devServerProcessRef.current.kill()
                devServerProcessRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]) // Re-run if storageKey (assistantId-templateId combo) changes

    const runCommand = useCallback(async (commandString: string) => {
        if (!webcontainerInstanceRef.current) return

        addTerminalOutput(`$ ${commandString}`)
        const parts = commandString.trim().split(/\s+/)
        if (parts.length === 0) return

        const cmd = parts[0]
        const args = parts.slice(1)

        try {
            const process = await webcontainerInstanceRef.current.spawn(cmd, args)
            process.output.pipeTo(new WritableStream({ write(data) { addTerminalOutput(data) } }))
            await process.exit

            // Auto-save after npm commands that might modify package.json
            if (cmd === 'npm' && (args.includes('install') || args.includes('i') || args.includes('uninstall'))) {
                scheduleSave()
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            addTerminalOutput(`❌ Failed to run command: ${errorMsg}`)
        }
    }, [addTerminalOutput, scheduleSave])

    const exportFilesAsJson = useCallback(async (): Promise<{ [path: string]: string }> => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        return exportFilesAsJsonInternal(webcontainerInstanceRef.current)
    }, [])

    // Manually save workspace to localStorage
    const saveWorkspace = useCallback(async (): Promise<boolean> => {
        if (!webcontainerInstanceRef.current) return false
        try {
            const files = await exportFilesAsJsonInternal(webcontainerInstanceRef.current)
            const success = saveWorkspaceToStorage(storageKeyRef.current, files)
            if (success) {
                setHasStoredChanges(true)
                addTerminalOutput('💾 Workspace saved to browser storage')
            }
            return success
        } catch (err) {
            console.error('[WebContainer] Failed to save workspace:', err)
            return false
        }
    }, [addTerminalOutput])

    // Reset workspace to default template (clears localStorage)
    const resetWorkspace = useCallback(async () => {
        if (!webcontainerInstanceRef.current) return

        addTerminalOutput('🔄 Resetting workspace to default template...')

        // Clear stored workspace
        clearWorkspaceStorage(storageKeyRef.current)
        setHasStoredChanges(false)

        // Clean up current files
        const itemsToDelete = ['src', 'public', 'package.json', 'vite.config.js', 'index.html', 'tsconfig.json']
        for (const item of itemsToDelete) {
            try {
                await webcontainerInstanceRef.current.fs.rm(item, { recursive: true })
            } catch {
                // Ignore errors if file doesn't exist
            }
        }

        // Reload fresh template
        const template = getTemplateById(templateIdRef.current)
        if (!template) throw new Error(`Template not found: ${templateIdRef.current}`)

        const templateFiles: any = {}
        for (const [path, content] of Object.entries(template.files)) {
            const pathParts = path.split("/").filter(Boolean)
            let current = templateFiles

            for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i]
                if (!current[part]) current[part] = { directory: {} }
                current = current[part].directory
            }

            const fileName = pathParts[pathParts.length - 1]
            current[fileName] = { file: { contents: content } }
        }

        await webcontainerInstanceRef.current.mount(templateFiles)
        addTerminalOutput('✅ Workspace reset to default template')

        // Re-install dependencies
        setIsInstalling(true)
        await installDependencies(webcontainerInstanceRef.current)
    }, [addTerminalOutput, installDependencies])

    // Cleanup save timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    return {
        isBooting,
        isInstalling,
        isServerReady,
        serverUrl,
        terminalOutput,
        error,
        writeFile,
        webcontainerInstance,
        createFile,
        deleteFile,
        renameFile,
        readFile,
        createFolder,
        deleteFolder,
        runCommand,
        exportFilesAsJson,
        saveWorkspace,
        resetWorkspace,
        hasStoredChanges,
    }
}
