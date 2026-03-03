"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { WebContainer } from "@webcontainer/api"
import { getTemplateById } from "@/lib/templates"

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
}

let globalWebContainerPromise: Promise<WebContainer> | null = null

// ── Persistence helpers ──────────────────────────────────────────────────────
function getStorageKey(assistantId: string, templateId: string) {
    return `bcoder_files_${assistantId}_${templateId}`
}
function loadSavedFiles(key: string): Record<string, string> {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        return raw ? JSON.parse(raw) : {}
    } catch { return {} }
}
function persistFile(key: string, path: string, content: string) {
    try {
        const saved = loadSavedFiles(key)
        saved[path] = content
        localStorage.setItem(key, JSON.stringify(saved))
    } catch { /* ignore quota errors */ }
}
function forgetFile(key: string, path: string) {
    try {
        const saved = loadSavedFiles(key)
        delete saved[path]
        localStorage.setItem(key, JSON.stringify(saved))
    } catch {}
}
function forgetFolder(key: string, folderPath: string) {
    try {
        const saved = loadSavedFiles(key)
        const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
        for (const p of Object.keys(saved)) {
            if (p === folderPath || p.startsWith(prefix)) delete saved[p]
        }
        localStorage.setItem(key, JSON.stringify(saved))
    } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export function useWebContainer(assistantId: string, templateId: string): UseWebContainerReturn {
    const [isBooting, setIsBooting] = useState(true)
    const [isInstalling, setIsInstalling] = useState(false)
    const [isServerReady, setIsServerReady] = useState(false)
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [terminalOutput, setTerminalOutput] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null)

    const webcontainerInstanceRef = useRef<WebContainer | null>(null)
    const devServerProcessRef = useRef<any | null>(null)
    const isBootingRef = useRef(false)
    const storageKey = getStorageKey(assistantId, templateId)

    const addTerminalOutput = useCallback((message: string) => {
        setTerminalOutput((prev) => [...prev, message])
    }, [])

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
            persistFile(storageKey, normalizedPath, content)
        } catch (err) {
            console.error('[writeFile] Failed to write', normalizedPath, err)
        }
    }, [storageKey])

    const createFile = useCallback(async (path: string, content: string = "") => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.writeFile(path, content)
        persistFile(storageKey, path, content)
    }, [storageKey])

    const deleteFile = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.rm(path)
        forgetFile(storageKey, path)
    }, [storageKey])

    const renameFile = useCallback(async (oldPath: string, newPath: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        const content = await webcontainerInstanceRef.current.fs.readFile(oldPath, "utf-8")
        await webcontainerInstanceRef.current.fs.writeFile(newPath, content)
        await webcontainerInstanceRef.current.fs.rm(oldPath)
        persistFile(storageKey, newPath, content)
        forgetFile(storageKey, oldPath)
    }, [storageKey])

    const readFile = useCallback(async (path: string): Promise<string> => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        return await webcontainerInstanceRef.current.fs.readFile(path, "utf-8")
    }, [])

    const createFolder = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.mkdir(path, { recursive: true })
    }, [])

    const deleteFolder = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.rm(path, { recursive: true })
        forgetFolder(storageKey, path)
    }, [storageKey])

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

                addTerminalOutput(`📦 Loading template: ${templateId}`)
                const template = getTemplateById(templateId)

                if (!template) throw new Error(`Template not found: ${templateId}`)

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

                addTerminalOutput("📁 Mounting template files...")
                await webcontainer.mount(templateFiles)
                addTerminalOutput("✅ Files mounted!")

                // Restore any previously saved user edits over the template
                const savedFiles = loadSavedFiles(storageKey)
                const savedEntries = Object.entries(savedFiles)
                if (savedEntries.length > 0) {
                    addTerminalOutput(`♻️ Restoring ${savedEntries.length} saved file(s)...`)
                    for (const [filePath, fileContent] of savedEntries) {
                        try {
                            const parts = filePath.split('/').filter(Boolean)
                            if (parts.length > 1) {
                                const dir = parts.slice(0, -1).join('/')
                                await webcontainer.fs.mkdir(dir, { recursive: true }).catch(() => {})
                            }
                            await webcontainer.fs.writeFile(filePath, fileContent)
                        } catch { /* best-effort */ }
                    }
                    addTerminalOutput("✅ Files restored!")
                }

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
    }, [templateId]) // Added templateId as dependency to re-run if it changes dynamically

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
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            addTerminalOutput(`❌ Failed to run command: ${errorMsg}`)
        }
    }, [addTerminalOutput])

    const exportFilesAsJson = useCallback(async (): Promise<{ [path: string]: string }> => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")

        const result: { [path: string]: string } = {}

        const readDirRecursive = async (path: string) => {
            const entries = await webcontainerInstanceRef.current!.fs.readdir(path, { withFileTypes: true })

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
                        // Assuming text files for this export. Binary files like images might need
                        // special base64 handling if they are user-uploaded, but for template code, utf-8 works.
                        const content = await webcontainerInstanceRef.current!.fs.readFile(fullPath, "utf-8")
                        result[fullPath] = content
                    } catch (err) {
                        console.error(`Failed to read file for export: ${fullPath}`, err)
                    }
                }
            }
        }

        await readDirRecursive('.')
        return result
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
    }
}
