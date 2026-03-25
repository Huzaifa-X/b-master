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
import { useLocale } from "@/lib/i18n"


// Create File Dialog
interface CreateFileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (fileName: string) => void
    currentPath?: string
}

export function CreateFileDialog({ open, onOpenChange, onConfirm, currentPath = "" }: CreateFileDialogProps) {
    const { t } = useLocale()
    const [fileName, setFileName] = useState("")
    const [error, setError] = useState("")


    const handleConfirm = () => {
        // Validation
        if (!fileName.trim()) {
            setError(t("bCoder.dialogs.fileNameRequired"))
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
            setError(t("bCoder.dialogs.invalidName", { type: t("bCoder.newFile") }))
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
                        <DialogTitle>{t("bCoder.dialogs.createFile")}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {currentPath 
                          ? t("bCoder.dialogs.creatingIn", { type: t("bCoder.newFile"), path: currentPath }) 
                          : t("bCoder.dialogs.creatingInRoot", { type: t("bCoder.newFile") })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fileName">{t("bCoder.dialogs.fileName")}</Label>
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
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleConfirm}>{t("bCoder.dialogs.createFile")}</Button>
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
    const { t } = useLocale()
    const [folderName, setFolderName] = useState("")
    const [error, setError] = useState("")

    const handleConfirm = () => {
        // Validation
        if (!folderName.trim()) {
            setError(t("bCoder.dialogs.folderNameRequired"))
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(folderName)) {
            setError(t("bCoder.dialogs.invalidName", { type: t("bCoder.newFolder") }))
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
                        <DialogTitle>{t("bCoder.dialogs.createFolder")}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {currentPath 
                          ? t("bCoder.dialogs.creatingIn", { type: t("bCoder.newFolder"), path: currentPath }) 
                          : t("bCoder.dialogs.creatingInRoot", { type: t("bCoder.newFolder") })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="folderName">{t("bCoder.dialogs.folderName")}</Label>
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
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleConfirm}>{t("bCoder.dialogs.createFolder")}</Button>
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
    const { t } = useLocale()
    const [newName, setNewName] = useState(currentName)
    const [error, setError] = useState("")

    const handleConfirm = () => {
        // Validation
        if (!newName.trim()) {
            setError(t("bCoder.dialogs.invalidName", { type: itemType === "file" ? t("bCoder.newFile") : t("bCoder.newFolder") }))
            return
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(newName)) {
            setError(t("bCoder.dialogs.invalidName", { type: itemType === "file" ? t("bCoder.newFile") : t("bCoder.newFolder") }))
            return
        }

        if (newName === currentName) {
            setError(t("bCoder.dialogs.nameMustBeDifferent"))
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
                        <DialogTitle>{t("bCoder.rename")} {itemType === "file" ? t("bCoder.newFile") : t("bCoder.newFolder")}</DialogTitle>
                    </div>
                    <DialogDescription>
                         {t("bCoder.dialogs.enterNewName", { name: currentName })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="newName">{t("bCoder.dialogs.newName")}</Label>
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
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleConfirm}>{t("bCoder.rename")}</Button>
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
    const { t } = useLocale()
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
                        <DialogTitle>{t("bCoder.dialogs.deleteConfirmTitle", { type: itemType === "file" ? t("bCoder.newFile") : t("bCoder.newFolder") })}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {t("bCoder.dialogs.deleteConfirmDescription", {
                            name: itemName,
                            folderWarning: itemType === "folder" ? t("bCoder.dialogs.folderWarning") : ""
                        })}
                        <br />
                        <span className="text-red-600 dark:text-red-400 font-semibold">{t("bCoder.dialogs.cannotBeUndone")}</span>
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm}>
                        {t("bCoder.delete")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

