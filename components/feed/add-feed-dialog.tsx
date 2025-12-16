"use client"

import { useState, useRef, useEffect } from "react"
import { X, Upload, ImageIcon, Globe, Lock, Loader2, Users } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useAssistantContacts } from "@/hooks/useContacts"
import { useSession } from "next-auth/react"

// Constants
const MAX_TITLE_LENGTH = 100
const MAX_CONTENT_LENGTH = 1000
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

interface AddFeedDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    assistantId: string
    onSubmit: (feed: {
        title: string
        content: string
        image?: string
        privacy: "public" | "private"
        allowedUserIds?: string[]
    }) => void
    isLoading?: boolean
    initialTitle?: string
    initialContent?: string
}

export function AddFeedDialog({
    open,
    onOpenChange,
    assistantId,
    onSubmit,
    isLoading = false,
    initialTitle = "",
    initialContent = ""
}: AddFeedDialogProps) {
    const { data: session } = useSession()
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [image, setImage] = useState<string | undefined>(undefined)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [privacy, setPrivacy] = useState<"public" | "private">("public")
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Set initial values when dialog opens
    useEffect(() => {
        if (open) {
            setTitle(initialTitle)
            setContent(initialContent)
        }
    }, [open, initialTitle, initialContent])

    // Fetch contacts who have newsfeed permission
    const { contacts, isLoading: contactsLoading } = useAssistantContacts(assistantId, {
        enabled: open && privacy === "private"
    })

    // Filter contacts who have newsfeed permission
    const contactsWithNewsfeedPermission = contacts.filter((contact: any) => {
        if (!contact.permissions) return false
        try {
            // Handle both string and array formats
            const permissions = typeof contact.permissions === 'string' 
                ? JSON.parse(contact.permissions)
                : contact.permissions
            return Array.isArray(permissions) && permissions.includes('newsfeed')
        } catch {
            return false
        }
    })

    const handleReset = () => {
        setTitle("")
        setContent("")
        setImage(undefined)
        setImageFile(null)
        setPrivacy("public")
        setSelectedUserIds([])
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
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

        // Validation for private posts
        if (privacy === "private" && selectedUserIds.length === 0) {
            toast.error("Please select at least one contact to share with")
            return
        }

        // Submit with proper data
        onSubmit({
            title: title.trim(),
            content: content.trim(),
            image: image,
            privacy,
            allowedUserIds: privacy === "private" ? selectedUserIds : undefined,
        })

        // Reset form after submission
        handleReset()
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check file size
        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("Image size must be less than 5MB")
            return
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload a valid image file")
            return
        }

        setImageFile(file)

        // Create preview URL with error handling
        const reader = new FileReader()
        
        reader.onloadend = () => {
            setImage(reader.result as string)
        }
        
        reader.onerror = () => {
            toast.error("Failed to read image file")
            setImageFile(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
        
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        setImage(undefined)
        setImageFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && !isLoading) {
            handleReset()
        }
        onOpenChange(newOpen)
    }

    const handlePrivacyChange = (newPrivacy: "public" | "private") => {
        setPrivacy(newPrivacy)
        if (newPrivacy === "public") {
            setSelectedUserIds([])
        }
    }

    const handleUserToggle = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds(prev => [...prev, userId])
        } else {
            setSelectedUserIds(prev => prev.filter(id => id !== userId))
        }
    }

    const isSubmitDisabled = 
        !title.trim() || 
        !content.trim() || 
        isLoading ||
        (privacy === "private" && selectedUserIds.length === 0)

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                        <Select 
                            value={privacy} 
                            onValueChange={handlePrivacyChange}
                            disabled={isLoading}
                        >
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

                    {/* User Selection for Private Posts */}
                    {privacy === "private" && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">
                                Share with specific contacts <span className="text-destructive">*</span>
                            </Label>
                            <div className="border rounded-md p-3 bg-muted/20">
                                {contactsLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span className="text-sm text-muted-foreground">Loading contacts...</span>
                                    </div>
                                ) : contactsWithNewsfeedPermission.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            No contacts with newsfeed permission found
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="max-h-48">
                                        <div className="space-y-2">
                                            {contactsWithNewsfeedPermission.map((contact) => (
                                                <div key={contact.contactId} className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`contact-${contact.contactId}`}
                                                        checked={selectedUserIds.includes(contact.contactId)}
                                                        onCheckedChange={(checked) =>
                                                            handleUserToggle(contact.contactId, checked as boolean)
                                                        }
                                                        disabled={isLoading}
                                                    />
                                                    <label
                                                        htmlFor={`contact-${contact.contactId}`}
                                                        className="flex items-center space-x-3 flex-1 cursor-pointer text-sm"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{contact.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {contact.email}
                                                            </p>
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                                {selectedUserIds.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                        <p className="text-xs text-muted-foreground">
                                            {selectedUserIds.length} contact{selectedUserIds.length !== 1 ? 's' : ''} selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                            maxLength={MAX_TITLE_LENGTH}
                            disabled={isLoading}
                            aria-label="Post title"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {title.length}/{MAX_TITLE_LENGTH}
                        </p>
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
                            maxLength={MAX_CONTENT_LENGTH}
                            disabled={isLoading}
                            aria-label="Post content"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {content.length}/{MAX_CONTENT_LENGTH}
                        </p>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="image">Image (Optional)</Label>
                        <div className="flex flex-col gap-3">
                            {image ? (
                                <div className="relative">
                                    <img
                                        src={image}
                                        alt="Upload preview"
                                        className="w-full h-48 object-cover rounded-md"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={handleRemoveImage}
                                        disabled={isLoading}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={fileInputRef}
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        disabled={isLoading}
                                        aria-label="Upload image"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        className="w-full"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Image
                                    </Button>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => handleOpenChange(false)} 
                        disabled={isLoading}
                        className="hover:cursor-pointer hover:bg-transparent hover:text-primary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
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