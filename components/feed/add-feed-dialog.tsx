"use client"

import { useState, useRef } from "react"
import { X, Upload, ImageIcon, Globe, Lock, Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface AddFeedDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (feed: {
        title: string
        content: string
        image?: string
        privacy: "public" | "private"
    }) => void
    isLoading?: boolean
}

export function AddFeedDialog({ open, onOpenChange, onSubmit, isLoading = false }: AddFeedDialogProps) {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [image, setImage] = useState<string | undefined>(undefined)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [privacy, setPrivacy] = useState<"public" | "private">("public")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleReset = () => {
        setTitle("")
        setContent("")
        setImage(undefined)
        setImageFile(null)
        setPrivacy("public")
    }

    const handleSubmit = () => {
        // Validation
        if (!title.trim()) {
            toast.error("Please enter a title")
            return
        }
        if (!content.trim()) {
            toast.error("Please enter content")
            return
        }

        // Submit
        onSubmit({
            title: title.trim(),
            content: content.trim(),
            image,
            privacy,
        })

        // Reset form
        handleReset()
        toast.success(`Post created successfully as ${privacy}!`)
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size must be less than 5MB")
                return
            }

            // Check file type
            if (!file.type.startsWith("image/")) {
                toast.error("Please upload a valid image file")
                return
            }

            setImageFile(file)

            // Create preview URL
            const reader = new FileReader()
            reader.onloadend = () => {
                setImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveImage = () => {
        setImage(undefined)
        setImageFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleReset()
        }
        onOpenChange(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                    <DialogDescription>
                        Share your thoughts, updates, or important information with your team.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Privacy Selector */}
                    <div className="space-y-2 w-full">
                        <Label htmlFor="privacy">
                            Privacy <span className="text-destructive">*</span>
                        </Label>
                        <Select value={privacy} onValueChange={(value) => setPrivacy(value as "public" | "private")}>
                            <SelectTrigger id="privacy" className="w-full">
                                <SelectValue placeholder="Select privacy" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                                <SelectItem value="public" className="focus:bg-muted focus:text-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                            <Globe className="h-3 w-3 text-green-700 dark:text-green-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">Public</span>
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="private" className="focus:bg-muted focus:text-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                                            <Lock className="h-3 w-3 text-orange-700 dark:text-orange-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">Private</span>
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-2">
                        <Label htmlFor="title">
                            Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="title"
                            placeholder="Enter a catchy title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
                    </div>

                    {/* Content Textarea */}
                    <div className="space-y-2">
                        <Label htmlFor="content">
                            Content <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="content"
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[150px] resize-none"
                            maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground text-right">{content.length}/1000</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} className="hover:cursor-pointer hover:bg-transparent hover:text-primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !content.trim() || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            <>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Post
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

