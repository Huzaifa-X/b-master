"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, FileText, FolderPlus, Edit3, Trash2 } from "lucide-react"

// Create File Dialog
interface CreateFileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (fileName: string) => void
    currentPath?: string
}

export function CreateFileDialog({ open, onOpenChange, onConfirm, currentPath = "" }: CreateFileDialogProps) {
    const [fileName, setFileName] = useState("")
    const [error, setError] = useState("")

    const handleConfirm = () => {
        // Validation
        if (!fileName.trim()) {
            setError("File name is required")
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
            setError("File name can only contain letters, numbers, dots, hyphens, and underscores")
            return
        }

        onConfirm(fileName)
        setFileName("")
        setError("")
        onOpenChange(false)
    }

    const handleCancel = () => {
        setFileName("")
        setError("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <DialogTitle>Create New File</DialogTitle>
                    </div>
                    <DialogDescription>
                        {currentPath ? `Creating file in ${currentPath}` : "Creating file in root directory"}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fileName">File Name</Label>
                        <Input
                            id="fileName"
                            placeholder="example.tsx"
                            value={fileName}
                            onChange={(e) => {
                                setFileName(e.target.value)
                                setError("")
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirm()
                                if (e.key === "Escape") handleCancel()
                            }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>Create File</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Create Folder Dialog
interface CreateFolderDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (folderName: string) => void
    currentPath?: string
}

export function CreateFolderDialog({ open, onOpenChange, onConfirm, currentPath = "" }: CreateFolderDialogProps) {
    const [folderName, setFolderName] = useState("")
    const [error, setError] = useState("")

    const handleConfirm = () => {
        // Validation
        if (!folderName.trim()) {
            setError("Folder name is required")
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(folderName)) {
            setError("Folder name can only contain letters, numbers, dots, hyphens, and underscores")
            return
        }

        onConfirm(folderName)
        setFolderName("")
        setError("")
        onOpenChange(false)
    }

    const handleCancel = () => {
        setFolderName("")
        setError("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <FolderPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <DialogTitle>Create New Folder</DialogTitle>
                    </div>
                    <DialogDescription>
                        {currentPath ? `Creating folder in ${currentPath}` : "Creating folder in root directory"}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="folderName">Folder Name</Label>
                        <Input
                            id="folderName"
                            placeholder="components"
                            value={folderName}
                            onChange={(e) => {
                                setFolderName(e.target.value)
                                setError("")
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirm()
                                if (e.key === "Escape") handleCancel()
                            }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>Create Folder</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Rename Dialog
interface RenameDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (newName: string) => void
    currentName: string
    itemType: "file" | "folder"
}

export function RenameDialog({ open, onOpenChange, onConfirm, currentName, itemType }: RenameDialogProps) {
    const [newName, setNewName] = useState(currentName)
    const [error, setError] = useState("")

    const handleConfirm = () => {
        // Validation
        if (!newName.trim()) {
            setError(`${itemType === "file" ? "File" : "Folder"} name is required`)
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(newName)) {
            setError("Name can only contain letters, numbers, dots, hyphens, and underscores")
            return
        }

        if (newName === currentName) {
            setError("New name must be different from current name")
            return
        }

        onConfirm(newName)
        setError("")
        onOpenChange(false)
    }

    const handleCancel = () => {
        setNewName(currentName)
        setError("")
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <DialogTitle>Rename {itemType === "file" ? "File" : "Folder"}</DialogTitle>
                    </div>
                    <DialogDescription>
                        Enter a new name for "{currentName}"
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="newName">New Name</Label>
                        <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => {
                                setNewName(e.target.value)
                                setError("")
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirm()
                                if (e.key === "Escape") handleCancel()
                            }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>Rename</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Delete Confirmation Dialog
interface DeleteConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    itemName: string
    itemType: "file" | "folder"
}

export function DeleteConfirmDialog({ open, onOpenChange, onConfirm, itemName, itemType }: DeleteConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle>Delete {itemType === "file" ? "File" : "Folder"}</DialogTitle>
                    </div>
                    <DialogDescription>
                        Are you sure you want to delete "{itemName}"?
                        {itemType === "folder" && " This will delete all files and folders inside it."}
                        <br />
                        <span className="text-red-600 dark:text-red-400 font-semibold">This action cannot be undone.</span>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
