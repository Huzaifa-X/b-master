"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Editor from "@monaco-editor/react"
import {
  FileCode,
  ChevronRight,
  ChevronDown,
  FileJson,
  FileType,
  Package,
  Eye,
  Code,
  Loader2,
  AlertCircle,
  FilePlus,
  FolderPlus,
  Edit3,
  Trash2,
  Folder,
  Globe,
  RotateCcw,
  HardDrive,
  Maximize2,
  Minimize2
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useBCoderContext } from "./b-coder-context"
import {
  CreateFileDialog,
  CreateFolderDialog,
  RenameDialog,
  DeleteConfirmDialog,
} from "./file-dialogs"
import { SupabaseConnectDialog } from "./supabase-connect-dialog"
import { useBCoderSupabase } from "@/hooks/useBCoderSupabase"
import { GithubDeployDialog } from "./github-deploy-dialog"
import { deployToGithubAndVercel } from "@/app/actions/deploy.action"
import { useLocale } from "@/lib/i18n"


interface FileNode {
  name: string
  type: "file" | "folder"
  language?: string
  path: string
  children?: FileNode[]
}

function FileTreeItem({
  node,
  level = 0,
  onSelect,
  selectedPath,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  openFolders,
  toggleFolder,
}: {
  node: FileNode
  level?: number
  onSelect: (path: string, language: string) => void
  selectedPath: string
  onCreateFile: (parentPath: string) => void
  onCreateFolder: (parentPath: string) => void
  onRename: (path: string, type: "file" | "folder") => void
  onDelete: (path: string, type: "file" | "folder") => void
  openFolders: Set<string>
  toggleFolder: (path: string) => void
}) {
  const { t } = useLocale()
  const isOpen = openFolders.has(node.path)

  const isSelected = selectedPath === node.path

  const getIcon = () => {
    if (node.type === "folder") {
      return isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
    }
    if (node.name.endsWith(".json")) return <FileJson className="h-4 w-4 text-yellow-500" />
    if (node.name.endsWith(".tsx") || node.name.endsWith(".ts")) return <FileType className="h-4 w-4 text-blue-500" />
    if (node.name.endsWith(".css")) return <FileCode className="h-4 w-4 text-purple-500" />
    if (node.name.endsWith(".html")) return <FileCode className="h-4 w-4 text-orange-500" />
    return <FileCode className="h-4 w-4 text-gray-500" />
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "group flex items-center gap-2 h-7 px-2 cursor-pointer transition-colors relative",
              isSelected
                ? "bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                : "text-foreground/80 hover:bg-muted/60"
            )}
            style={{ paddingLeft: `${level * 14 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") {
                toggleFolder(node.path)
              } else {
                onSelect(node.path, node.language || "javascript")
              }
            }}
          >
            {/* Selection indicator bar */}
            {isSelected && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-emerald-500 rounded-full" />
            )}

            {/* Folder chevron or file icon */}
            {node.type === "folder" ? (
              <div className="flex items-center gap-1">
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Folder className={cn("h-4 w-4", isOpen ? "text-blue-500" : "text-blue-400")} />
              </div>
            ) : (
              <div className="ml-4">{getIcon()}</div>
            )}

            <span className={cn(
              "text-[13px] truncate",
              isSelected ? "font-medium" : "font-normal"
            )}>
              {node.name}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          {node.type === "folder" && (
            <>
              <ContextMenuItem onClick={() => onCreateFile(node.path)} className="gap-2">
                <FilePlus className="h-4 w-4" />
                {t("bCoder.newFile")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFolder(node.path)} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                {t("bCoder.newFolder")}
              </ContextMenuItem>


              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRename(node.path, node.type)} className="gap-2">
            <Edit3 className="h-4 w-4" />
            {t("bCoder.rename")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(node.path, node.type)} className="gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
            <Trash2 className="h-4 w-4" />
            {t("bCoder.delete")}
          </ContextMenuItem>


        </ContextMenuContent>
      </ContextMenu>

      {node.type === "folder" && isOpen && node.children && (
        <div className="relative">
          {/* Indent guide line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${level * 14 + 18}px` }}
          />
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface MonacoEditorPanelProps {
  templateId: string
  assistantId: string
}

export function MonacoEditorPanel({ templateId, assistantId }: MonacoEditorPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [editorContent, setEditorContent] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [localFileStructure, setLocalFileStructure] = useState<FileNode[]>([])
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["src"]))
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false)
  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar toggle state
  const [isFullscreen, setIsFullscreen] = useState(false) // Preview fullscreen mode
  const { resolvedTheme } = useTheme()
  const { connection: supabaseConn } = useBCoderSupabase()
  const { t } = useLocale()


  const toggleFolder = useCallback((path: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const [createFileDialog, setCreateFileDialog] = useState<{ open: boolean; parentPath: string }>({ open: false, parentPath: "" })
  const [createFolderDialog, setCreateFolderDialog] = useState<{ open: boolean; parentPath: string }>({ open: false, parentPath: "" })
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; path: string; name: string; type: "file" | "folder" }>({ open: false, path: "", name: "", type: "file" })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; path: string; name: string; type: "file" | "folder" }>({ open: false, path: "", name: "", type: "file" })
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const {
    isBooting,
    isInstalling,
    isServerReady,
    serverUrl,
    error,
    createFile,
    deleteFile,
    renameFile,
    writeFile,
    createFolder,
    deleteFolder,
    buildFileTree: contextBuildFileTree,
    fileStructure: contextFileStructure,
    selectedFilePath,
    setSelectedFilePath,
    activeArtifact,
    webcontainerInstance,
    exportFilesAsJson,
    saveWorkspace,
    resetWorkspace,
    hasStoredChanges,
  } = useBCoderContext()

  const isUpdateMode = useMemo(() => {
    try {
      if (!activeArtifact || activeArtifact.category !== "Deployed Project") return false;
      const details = JSON.parse(activeArtifact.instructions);
      return !!(details.owner && details.repo);
    } catch (e) {
      return false;
    }
  }, [activeArtifact]);

  const initialRepoName = useMemo(() => {
    try {
      if (!activeArtifact || activeArtifact.category !== "Deployed Project") return "";
      const details = JSON.parse(activeArtifact.instructions);
      return details.repo || "";
    } catch (e) {
      return "";
    }
  }, [activeArtifact]);

  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light"

  const buildFileTree = useCallback(async () => {
    if (!webcontainerInstance || isBooting) return

    try {
      const readDir = async (path: string): Promise<FileNode[]> => {
        const entries = await webcontainerInstance.fs.readdir(path, { withFileTypes: true })
        const nodes: FileNode[] = []

        for (const entry of entries) {
          const fullPath = path === "/" ? `/${entry.name}` : `${path}/${entry.name}`
          const cleanPath = fullPath.replace(/^\//, "")

          if (entry.isDirectory()) {
            const children = await readDir(fullPath)
            nodes.push({ name: entry.name, type: "folder", path: cleanPath, children })
          } else {
            let language = "javascript"
            if (entry.name.endsWith(".json")) language = "json"
            else if (entry.name.endsWith(".css")) language = "css"
            else if (entry.name.endsWith(".html")) language = "html"
            else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) language = "typescript"

            nodes.push({ name: entry.name, type: "file", language, path: cleanPath })
          }
        }

        return nodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      }

      const tree = await readDir("/")
      setLocalFileStructure(tree)
    } catch {
      // Silently handle errors
    }
  }, [webcontainerInstance, isBooting])

  useEffect(() => {
    buildFileTree()
  }, [buildFileTree])

  useEffect(() => {
    if (isServerReady) {
      buildFileTree()
    }
  }, [isServerReady, buildFileTree])

  // Re-sync local file tree whenever the context file structure changes
  // (i.e. after the AI chat writes new/updated files via writeFile + contextBuildFileTree)
  useEffect(() => {
    if (contextFileStructure.length > 0) {
      buildFileTree()
    }
  }, [contextFileStructure, buildFileTree])

  useEffect(() => {
    if (!webcontainerInstance || isBooting || !selectedFilePath) return

    async function loadFileContent() {
      try {
        const content = await webcontainerInstance!.fs.readFile(selectedFilePath!, "utf-8")
        setEditorContent(content)
      } catch {
        setEditorContent("// Error loading file")
      }
    }

    loadFileContent()
  }, [selectedFilePath, webcontainerInstance, isBooting])

  const handleFileSelect = useCallback((path: string, language: string) => {
    setSelectedFilePath(path)
    setSelectedLanguage(language)
    setSidebarOpen(false) // Auto-close mobile sidebar when a file is mapped
  }, [setSelectedFilePath])

  useEffect(() => {
    if (!webcontainerInstance || isBooting || !editorContent || !selectedFilePath) return

    const timeoutId = setTimeout(() => {
      writeFile(selectedFilePath, editorContent)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [editorContent, selectedFilePath, writeFile, webcontainerInstance, isBooting])

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditorContent(value || "")
  }, [])

  const handleEditorWillMount = useCallback((monaco: any) => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      typeRoots: ["node_modules/@types"],
      skipLibCheck: true,
      strict: false,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
  }, [])

  const handleCreateFile = useCallback(async (fileName: string) => {
    try {
      const parentPath = createFileDialog.parentPath
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName

      await createFile(filePath, "// New file\n")
      await buildFileTree()
      await contextBuildFileTree()
      setCreateFileDialog({ open: false, parentPath: "" })
      handleFileSelect(filePath, "typescript")
    } catch {
      // Silently handle errors
    }
  }, [createFileDialog.parentPath, createFile, buildFileTree, contextBuildFileTree, handleFileSelect])

  const handleCreateFolder = useCallback(async (folderName: string) => {
    try {
      const parentPath = createFolderDialog.parentPath
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName

      await createFolder(folderPath)
      await buildFileTree()
      await contextBuildFileTree()
      setCreateFolderDialog({ open: false, parentPath: "" })
    } catch {
      // Silently handle errors
    }
  }, [createFolderDialog.parentPath, createFolder, buildFileTree, contextBuildFileTree])

  const handleRename = useCallback(async (newName: string) => {
    try {
      const oldPath = renameDialog.path
      const pathParts = oldPath.split("/")
      pathParts[pathParts.length - 1] = newName
      const newPath = pathParts.join("/")

      if (renameDialog.type === "file") {
        await renameFile(oldPath, newPath)
        if (selectedFilePath === oldPath) {
          setSelectedFilePath(newPath)
        }
      }

      await buildFileTree()
      await contextBuildFileTree()
      setRenameDialog({ open: false, path: "", name: "", type: "file" })
    } catch {
      // Silently handle errors
    }
  }, [renameDialog, renameFile, buildFileTree, contextBuildFileTree, selectedFilePath, setSelectedFilePath])

  const handleDelete = useCallback(async () => {
    try {
      const path = deleteDialog.path

      if (deleteDialog.type === "file") {
        await deleteFile(path)
        if (selectedFilePath === path) {
          setSelectedFilePath("src/App.jsx")
        }
      } else {
        await deleteFolder(path)
      }

      await contextBuildFileTree()
      setDeleteDialog({ open: false, path: "", name: "", type: "file" })
    } catch {
      // Silently handle errors
    }
  }, [deleteDialog, deleteFile, deleteFolder, buildFileTree, contextBuildFileTree, selectedFilePath, setSelectedFilePath])

  const handleDeploy = async (data: { repoName: string, description: string, isPrivate: boolean, isUpdate?: boolean }) => {
    try {
      const files = await exportFilesAsJson();
      const payload: any = {
        ...data,
        assistantId,
        files
      };
      if (data.isUpdate && activeArtifact) {
        payload.activeArtifactId = activeArtifact.id;
      }
      const result = await deployToGithubAndVercel(payload);
      return result;
    } catch (err: any) {
      return { success: false, error: { message: err.message || "Failed to extract WebContainer files." } }
    }
  }

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Modern Header */}
      <div className="border-b border-border/60 bg-background z-10">
        <div className="h-12 px-3 flex items-center justify-between">
          {/* Left Section - Toggle & Tabs */}
          <div className="flex items-center gap-3">
            {!isPreview && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-8 w-8 p-0 hover:bg-muted"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={t("bCoder.toggleExplorer")}
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
              </Button>

            )}

            {/* Code/Preview Toggle - Modern Pill Style */}
            <div className="flex items-center h-8 p-0.5 bg-muted/60 rounded-lg border border-border/50">
              <button
                onClick={() => {
                  setIsPreview(false)
                  setSidebarOpen(false)
                }}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-medium transition-all duration-200",
                  !isPreview
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Code className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("bCoder.code")}</span>
              </button>

              <button
                onClick={() => setIsPreview(true)}
                disabled={!isServerReady}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-medium transition-all duration-200",
                  isPreview
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !isServerReady && "opacity-50 cursor-not-allowed"
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("bCoder.preview")}</span>
              </button>

            </div>

            {/* Divider */}
            <div className="hidden sm:block h-5 w-px bg-border/60" />

            {/* Status Indicator - Modern Pill */}
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium transition-all",
              isBooting && "bg-muted text-muted-foreground",
              isInstalling && "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
              isServerReady && "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
              !isBooting && !isInstalling && !isServerReady && "bg-muted text-muted-foreground"
            )}>
              {isBooting && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t("bCoder.booting")}</span>
                </>
              )}

              {isInstalling && (
                <>
                  <Package className="h-3 w-3" />
                  <span>{t("bCoder.installing")}</span>
                </>
              )}

              {isServerReady && (
                <>
                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>{t("bCoder.ready")}</span>
                </>
              )}

              {!isBooting && !isInstalling && !isServerReady && (
                <>
                  <div className="h-1.5 w-1.5 bg-gray-400 rounded-full" />
                  <span>{t("bCoder.idle")}</span>
                </>
              )}

            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {/* Saved Indicator */}
            {hasStoredChanges && (
              <div className="hidden sm:flex items-center gap-1.5 h-6 px-2 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                <HardDrive className="h-3 w-3" />
                <span className="hidden md:inline">{t("bCoder.saved")}</span>
              </div>
            )}


            {/* Reset Button */}
            {hasStoredChanges && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetDialogOpen(true)}
                className="h-8 px-2 gap-1.5 text-xs font-medium text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                title={t("bCoder.resetTooltip")}
                disabled={isBooting || isInstalling}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t("bCoder.reset")}</span>
              </Button>

            )}

            {/* Save Button */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => saveWorkspace()}
              className="h-8 px-3 gap-1.5 text-xs font-medium border-border/60 hover:bg-muted"
              title="Save Changes Locally"
              disabled={isBooting || isInstalling || !isServerReady}
            >
              <HardDrive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save</span>
            </Button> */}

            {/* Divider */}
            <div className="h-5 w-px bg-border/60" />

            {/* Supabase Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSupabaseDialogOpen(true)}
              className={cn(
                "h-8 px-2 gap-1.5 text-xs font-medium transition-all",
                supabaseConn.connected
                  ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={supabaseConn.connected ? `Supabase: ${supabaseConn.projectRef}` : t("bCoder.connectSupabase")}

            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.277 21.998c-.403.02-.806-.102-1.124-.34a1.74 1.74 0 0 1-.627-1.084L10.47 10.47H3.03c-.522 0-1.01-.267-1.29-.707a1.49 1.49 0 0 1-.154-1.386l.002-.004C2.31 6.658 5.257 1.027 5.257 1.027c.23-.407.636-.7 1.103-.793a1.74 1.74 0 0 1 1.29.34c.38.295.627.73.627 1.084l1.056 10.105h7.44c.522 0 1.01.267 1.29.707.28.44.312.99.154 1.386l-.002.004c-.722 1.715-3.669 7.346-3.669 7.346-.23.407-.636.7-1.103.793-.09.018-.18.027-.27.027l.104-.028Z" />
              </svg>
              {supabaseConn.connected ? (
                <span className="hidden md:inline">{t("bCoder.connected")}</span>
              ) : (
                <span className="hidden md:inline">{t("bCoder.supabase")}</span>
              )}

            </Button>

            {/* Publish Button - Accent */}
            <Button
              size="sm"
              onClick={() => setDeployDialogOpen(true)}
              className="h-8 px-3 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              title={t("bCoder.publishTooltip")}
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("bCoder.publish")}</span>
            </Button>

          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="m-2 sm:m-4 text-xs sm:text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="break-all">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {!isPreview ? (
          <>
            {/* Overlay background for mobile sidebar */}
            {sidebarOpen && (
              <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* File Explorer Sidebar */}
            <div className={cn(
              "absolute md:relative top-0 bottom-0 left-0 z-30 w-60 border-r border-border/60 bg-background overflow-hidden transition-transform duration-200 h-full shadow-xl md:shadow-none",
              sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
              <div className="h-full flex flex-col">
                 {/* Explorer Header */}
                <div className="h-9 flex items-center justify-between px-3 border-b border-border/40 bg-muted/30 shrink-0">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("bCoder.explorer")}</span>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => setCreateFileDialog({ open: true, parentPath: "" })}
                      title={t("bCoder.newFile")}
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                      onClick={() => setCreateFolderDialog({ open: true, parentPath: "" })}
                      title={t("bCoder.newFolder")}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* File Tree */}
                <div className="flex-1 overflow-y-auto py-1">
                  {localFileStructure.map((node) => (
                    <FileTreeItem
                      key={node.path}
                      node={node}
                      onSelect={handleFileSelect}
                      selectedPath={selectedFilePath || ""}
                      onCreateFile={(parentPath) => setCreateFileDialog({ open: true, parentPath })}
                      onCreateFolder={(parentPath) => setCreateFolderDialog({ open: true, parentPath })}
                      onRename={(path, type) => {
                        const name = path.split("/").pop() || ""
                        setRenameDialog({ open: true, path, name, type })
                      }}
                      onDelete={(path, type) => {
                        const name = path.split("/").pop() || ""
                        setDeleteDialog({ open: true, path, name, type })
                      }}
                      openFolders={openFolders}
                      toggleFolder={toggleFolder}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Monaco Editor Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full w-full">
              {/* File Tab Bar */}
              <div className="h-9 border-b border-border/40 bg-muted/20 shrink-0 flex items-center px-3 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Active File Tab */}
                  <div className="flex items-center gap-2 h-7 px-3 bg-background rounded-md border border-border/50 shadow-sm">
                    <FileCode className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {selectedFilePath ? selectedFilePath.split('/').pop() : t("bCoder.noFileSelected")}
                    </span>
                  </div>
                  {/* Breadcrumb Path */}
                  {selectedFilePath && selectedFilePath.includes('/') && (
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3" />
                      <span className="truncate max-w-[300px]">{selectedFilePath}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language={selectedLanguage}
                  value={editorContent}
                  onChange={handleEditorChange}
                  beforeMount={handleEditorWillMount}
                  theme={editorTheme}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: "on",
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className={cn(
            "flex flex-col w-full min-w-0",
            isFullscreen ? "fixed inset-0 z-50 bg-background" : "flex-1"
          )}>
            {/* Preview Header */}
            <div className="h-9 border-b border-border/40 bg-muted/20 shrink-0 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 h-7 px-3 bg-background rounded-md border border-border/50 shadow-sm">
                  <Eye className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium">{t("bCoder.livePreview")}</span>
                </div>
                {/* {serverUrl && (
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="h-3 w-3" />
                    <span className="truncate max-w-[300px]">{serverUrl}</span>
                  </div>
                )} */}
              </div>
              {/* Preview Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                  title={isFullscreen ? t("bCoder.exitFullscreen") : t("bCoder.fullscreen")}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            {/* Preview Content */}
            <div className="flex-1 bg-white dark:bg-zinc-950 overflow-hidden relative w-full h-full">
              {serverUrl ? (
                <iframe src={serverUrl} className="w-full h-full absolute inset-0 border-0" title={t("bCoder.preview")} />
              ) : (
                <div className="flex items-center justify-center h-full bg-muted/10">
                  <div className="text-center">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="relative h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{t("bCoder.startingDevServer")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateFileDialog
        open={createFileDialog.open}
        onOpenChange={(open) => setCreateFileDialog({ ...createFileDialog, open })}
        onConfirm={handleCreateFile}
        currentPath={createFileDialog.parentPath}
      />

      <CreateFolderDialog
        open={createFolderDialog.open}
        onOpenChange={(open) => setCreateFolderDialog({ ...createFolderDialog, open })}
        onConfirm={handleCreateFolder}
        currentPath={createFolderDialog.parentPath}
      />

      <RenameDialog
        open={renameDialog.open}
        onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}
        onConfirm={handleRename}
        currentName={renameDialog.name}
        itemType={renameDialog.type}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={handleDelete}
        itemName={deleteDialog.name}
        itemType={deleteDialog.type}
      />

      <SupabaseConnectDialog
        open={supabaseDialogOpen}
        onOpenChange={setSupabaseDialogOpen}
      />

      <GithubDeployDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        onDeploy={handleDeploy}
        initialRepoName={initialRepoName}
        isUpdateMode={isUpdateMode}
      />

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bCoder.resetDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bCoder.resetDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 hover:bg-gray-300 text-gray-800">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await resetWorkspace()
                await contextBuildFileTree()
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {t("bCoder.resetWorkspace")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
