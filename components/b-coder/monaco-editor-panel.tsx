"use client"

import { useState, useEffect, useCallback } from "react"
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
  Globe
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
              "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-sm transition-colors",
              isSelected && "bg-emerald-50 dark:bg-emerald-950/30"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => {
              if (node.type === "folder") {
                toggleFolder(node.path)
              } else {
                onSelect(node.path, node.language || "javascript")
              }
            }}
          >
            {node.type === "folder" ? <Folder className="h-4 w-4 text-blue-500" /> : getIcon()}
            <span className={cn("text-sm", isSelected && "font-semibold text-emerald-600 dark:text-emerald-400")}>
              {node.name}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {node.type === "folder" && (
            <>
              <ContextMenuItem onClick={() => onCreateFile(node.path)}>
                <FilePlus className="h-4 w-4" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFolder(node.path)}>
                <FolderPlus className="h-4 w-4" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onRename(node.path, node.type)}>
            <Edit3 className="h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => onDelete(node.path, node.type)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {node.type === "folder" && isOpen && node.children && (
        <div>
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
}

export function MonacoEditorPanel({ templateId }: MonacoEditorPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("javascript")
  const [editorContent, setEditorContent] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [localFileStructure, setLocalFileStructure] = useState<FileNode[]>([])
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["src"]))
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const { connection: supabaseConn } = useBCoderSupabase()

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

  const {
    isBooting,
    isInstalling,
    isServerReady,
    serverUrl,
    error,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
    createFolder,
    deleteFolder,
    buildFileTree: contextBuildFileTree,
    fileStructure: contextFileStructure,
    selectedFilePath,
    setSelectedFilePath,
    webcontainerInstance,
  } = useBCoderContext()

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
  }, [setSelectedFilePath])

  useEffect(() => {
    if (!webcontainerInstance || isBooting || !editorContent || !selectedFilePath) return

    const timeoutId = setTimeout(() => {
      writeFile(selectedFilePath, editorContent)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [editorContent, selectedFilePath, writeFile, webcontainerInstance, isBooting])

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

      await buildFileTree()
      await contextBuildFileTree()
      setDeleteDialog({ open: false, path: "", name: "", type: "file" })
    } catch {
      // Silently handle errors
    }
  }, [deleteDialog, deleteFile, deleteFolder, buildFileTree, contextBuildFileTree, selectedFilePath, setSelectedFilePath])

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-gradient-to-r from-emerald-50/50 to-cyan-50/50 dark:from-emerald-950/20 dark:to-cyan-950/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={!isPreview ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs transition-colors",
                  !isPreview
                    ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40"
                    : "text-foreground hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-950/20"
                )}
                onClick={() => setIsPreview(false)}
              >
                <Code className="h-3 w-3 mr-1" />
                Code
              </Button>
              <Button
                variant={isPreview ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 text-xs transition-colors",
                  isPreview
                    ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/40"
                    : "text-foreground hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-950/20"
                )}
                onClick={() => setIsPreview(true)}
                disabled={!isServerReady}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
              {isBooting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {isInstalling && <Package className="h-4 w-4 animate-pulse text-amber-500" />}
              {isServerReady && (
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full animate-pulse" />
                  <div className="relative h-3 w-3 bg-emerald-500 rounded-full" />
                </div>
              )}
              {!isBooting && !isInstalling && !isServerReady && (
                <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSupabaseDialogOpen(true)}
                className={cn(
                  "h-8 px-2 gap-1.5 text-xs font-medium transition-all",
                  supabaseConn.connected
                    ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white"
                    : "bg-muted hover:bg-muted/80 opacity-80 hover:text-black dark:hover:text-white"
                )}
                title={supabaseConn.connected ? `Supabase: ${supabaseConn.projectRef}` : "Connect Supabase"}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.277 21.998c-.403.02-.806-.102-1.124-.34a1.74 1.74 0 0 1-.627-1.084L10.47 10.47H3.03c-.522 0-1.01-.267-1.29-.707a1.49 1.49 0 0 1-.154-1.386l.002-.004C2.31 6.658 5.257 1.027 5.257 1.027c.23-.407.636-.7 1.103-.793a1.74 1.74 0 0 1 1.29.34c.38.295.627.73.627 1.084l1.056 10.105h7.44c.522 0 1.01.267 1.29.707.28.44.312.99.154 1.386l-.002.004c-.722 1.715-3.669 7.346-3.669 7.346-.23.407-.636.7-1.103.793-.09.018-.18.027-.27.027l.104-.028Z" />
                </svg>
                {supabaseConn.connected ? (
                  <span className="hidden sm:inline">Connected</span>
                ) : (
                  <span className="hidden sm:inline">Supabase</span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 w-8 p-0 bg-black dark:bg-white border-black dark:border-white opacity-50 cursor-not-allowed"
                title="Deploy to GitHub (Coming Soon)"
              >
                <Globe className="h-4 w-4 text-white dark:text-black" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!isPreview ? (
          <>
            <div className="w-64 border-r bg-muted/30 overflow-y-auto">
              <div className="p-2">
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Files</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCreateFileDialog({ open: true, parentPath: "" })} title="New File">
                      <FilePlus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setCreateFolderDialog({ open: true, parentPath: "" })} title="New Folder">
                      <FolderPlus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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

            <div className="flex-1 flex flex-col">
              <div className="border-b px-4 py-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFilePath || "No file selected"}</span>
                </div>
              </div>
              <div className="flex-1">
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
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="border-b px-4 py-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-900">
              {serverUrl ? (
                <iframe src={serverUrl} className="w-full h-full border-0" title="Preview" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Starting server...</p>
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
    </div>
  )
}
