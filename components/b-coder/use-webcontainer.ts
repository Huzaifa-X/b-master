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
}

export function useWebContainer(templateId: string): UseWebContainerReturn {
    const [isBooting, setIsBooting] = useState(true)
    const [isInstalling, setIsInstalling] = useState(false)
    const [isServerReady, setIsServerReady] = useState(false)
    const [serverUrl, setServerUrl] = useState<string | null>(null)
    const [terminalOutput, setTerminalOutput] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    // State-tracked instance so consumers re-render when it becomes available
    const [webcontainerInstance, setWebcontainerInstance] = useState<WebContainer | null>(null)

    const webcontainerInstanceRef = useRef<WebContainer | null>(null)
    const isBootingRef = useRef(false)

    const addTerminalOutput = useCallback((message: string) => {
        setTerminalOutput((prev) => [...prev, message])
    }, [])

    const writeFile = useCallback(async (path: string, content: string) => {
        if (!webcontainerInstanceRef.current) return
        // Normalize path: WebContainer uses relative paths, strip leading slash
        const normalizedPath = path.startsWith('/') ? path.slice(1) : path
        try {
            // Ensure parent directories exist before writing
            const parts = normalizedPath.split('/')
            if (parts.length > 1) {
                const dir = parts.slice(0, -1).join('/')
                await webcontainerInstanceRef.current.fs.mkdir(dir, { recursive: true })
            }
            await webcontainerInstanceRef.current.fs.writeFile(normalizedPath, content)
        } catch (err) {
            console.error('[writeFile] Failed to write', normalizedPath, err)
        }
    }, [])

    const createFile = useCallback(async (path: string, content: string = "") => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.writeFile(path, content)
    }, [])

    const deleteFile = useCallback(async (path: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        await webcontainerInstanceRef.current.fs.rm(path)
    }, [])

    const renameFile = useCallback(async (oldPath: string, newPath: string) => {
        if (!webcontainerInstanceRef.current) throw new Error("WebContainer not ready")
        const content = await webcontainerInstanceRef.current.fs.readFile(oldPath, "utf-8")
        await webcontainerInstanceRef.current.fs.writeFile(newPath, content)
        await webcontainerInstanceRef.current.fs.rm(oldPath)
    }, [])

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
    }, [])

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
        addTerminalOutput("🚀 Starting Vite dev server...")

        try {
            const serverProcess = await webcontainer.spawn("npm", ["run", "dev"])
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

    useEffect(() => {
        if (isBootingRef.current || webcontainerInstanceRef.current) return

        isBootingRef.current = true

        async function bootWebContainer() {
            try {
                addTerminalOutput("⏳ Booting WebContainer...")
                const webcontainer = await WebContainer.boot()
                webcontainerInstanceRef.current = webcontainer
                setWebcontainerInstance(webcontainer)
                addTerminalOutput("✅ WebContainer booted!")

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

                addTerminalOutput("📁 Mounting files...")
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

        return () => {
            if (webcontainerInstanceRef.current) {
                webcontainerInstanceRef.current.teardown()
                webcontainerInstanceRef.current = null
                isBootingRef.current = false
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
    }
}
