"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"
import prisma from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/aws-s3"
import openAISoraService from "@/lib/services/openai-sora.service"
import s3VideoUploadService from "@/lib/services/s3-video-upload.service"
import { generateVideoArtifactHtml } from "@/lib/templates/video-artifact.template"
import { 
    GenerateArtifactInstructionsParams, 
    GenerateArtifactInstructionsResult 
} from "@/types/artifact-ai-instruction"

const ARTIFACT_INSTRUCTION_GENERATION_PROMPT = `You are an expert AI artifact creator with extensive knowledge of web development, data visualization, and interactive application design.

Your task is to generate comprehensive, clear, and actionable instructions for creating AI-powered artifacts based on user descriptions. Follow these guidelines:

1. **Structure**: Create well-organized instructions with clear sections covering:
   - Purpose and Overview
   - Key Features and Functionality
   - Data Structure and Management
   - User Interface Components
   - Interactivity and User Experience
   - Visual Design and Styling
   - Technical Implementation Details

2. **Specificity**: Be specific about:
   - HTML structure and semantic elements
   - CSS styling approach (colors, layout, responsiveness)
   - JavaScript functionality and event handlers
   - Data handling and state management
   - Form inputs and validation
   - Charts, graphs, or visualizations needed
   - Export/import capabilities if mentioned

3. **Completeness**: Cover all aspects mentioned in the user's description including:
   - All requested features
   - Data fields and their types
   - Calculations or computations
   - Filtering and sorting capabilities
   - Responsive design considerations
   - Accessibility features

4. **Professional**: Use clear, professional language suitable for AI systems to generate production-ready artifacts

5. **Actionable**: Provide concrete instructions that an AI can follow to create a complete, functional artifact

6. **Best Practices**: Include:
   - Modern web development practices
   - Clean, maintainable code structure
   - User-friendly interface design
   - Error handling and validation
   - Performance considerations

Format your response as a complete instruction set that can be directly used to generate an HTML/CSS/JavaScript artifact. Focus on creating instructions that will result in a polished, professional, and fully functional web application.`

export async function generateArtifactInstructions({
    prompt,
}: GenerateArtifactInstructionsParams): Promise<GenerateArtifactInstructionsResult> {
    try {
        // Get authenticated user
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        if (!prompt?.trim()) {
            return {
                success: false,
                error: 'Prompt cannot be empty'
            }
        }

        // Generate instructions using OpenAI Responses API
        const model = 'gpt-5'

        const response = await openai.responses.create({
            model: model,
            reasoning: { effort: "medium" },
            instructions: ARTIFACT_INSTRUCTION_GENERATION_PROMPT,
            input: `Generate detailed instructions for creating the following artifact:\n\n${prompt}`,
        })

        const instructions = response.output_text

        if (!instructions) {
            return {
                success: false,
                error: 'Failed to generate instructions'
            }
        }

        return {
            success: true,
            instructions: instructions.trim()
        }

    } catch (error) {
        console.error('Error generating artifact instructions:', error)
        
        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: 'An unexpected error occurred while generating instructions'
        }
    }
}

// Get assistant contacts for artifact sharing
export async function getAssistantContacts(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                contacts: []
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Verify user owns or has access to this assistant
        const assistant = await prisma.assistant.findFirst({
            where: {
                id: assistantIdBigInt,
                OR: [
                    { userId: userId },
                    {
                        contacts: {
                            some: {
                                userId: userId
                            }
                        }
                    }
                ]
            }
        })

        if (!assistant) {
            return {
                success: false,
                error: 'Assistant not found or access denied',
                contacts: []
            }
        }

        // Fetch all contacts for this assistant (including owner - owner is now in AssistantContact)
        const contacts = await prisma.assistantContact.findMany({
            where: {
                assistantId: assistantIdBigInt,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedContacts = contacts.map(contact => ({
            id: contact.user.id.toString(),
            name: contact.user.name || 'Unknown User',
            email: contact.user.email,
            image: contact.user.image
        }))

        return {
            success: true,
            contacts: formattedContacts
        }

    } catch (error) {
        console.error('Error fetching assistant contacts:', error)
        return {
            success: false,
            error: 'Failed to fetch contacts',
            contacts: []
        }
    }
}

const ARTIFACT_GENERATION_PROMPT = `You are an expert web developer specializing in creating interactive HTML/CSS/JavaScript applications.

When generating artifacts, you will receive:
1. User instructions and requirements
2. Extracted text content from uploaded documents (if any)
3. Image URLs to embed (if any)
4. Extracted tables as base64-encoded images (if any)

**CRITICAL REQUIREMENTS:**

1. **Document Content Integration:**
   - Use extracted text to populate the artifact with real, meaningful data
   - Structure content logically based on document organization
   - Preserve important information hierarchy
   - Use extracted HTML structure when available

2. **Image Embedding:**
   - Embed all provided image URLs using proper <img> tags
   - Make images responsive: max-width: 100%; height: auto;
   - Add descriptive alt text based on context
   - Apply appropriate styling (border-radius, shadows, margins)
   - Use loading="lazy" for performance

3. **Table Handling:**
   - Tables extracted as base64 images should be embedded as:
     <img src="data:image/png;base64,{BASE64_DATA}" alt="Table from page X" style="max-width: 100%; height: auto;">
   - Position tables appropriately within content flow

4. **Complete Self-Contained HTML:**
   - Full <!DOCTYPE html> with proper structure
   - All CSS in <style> tag in <head>
   - All JavaScript in <script> tag before </body>
   - Include SecureStorage wrapper (MANDATORY)

5. **Responsive Design:**
   - Mobile-first approach
   - Flexible layouts with CSS Grid/Flexbox
   - Responsive images and tables
   - Touch-friendly interactions

6. **Modern UI/UX:**
   - Clean, professional design
   - Consistent color scheme
   - Proper spacing and typography
   - Smooth transitions and animations

8. **CRITICAL - Secure Storage Implementation**: 
   ALWAYS use this exact SecureStorage wrapper for data persistence. This is MANDATORY:
   
   \`\`\`javascript
   // Secure storage wrapper - MUST be included at the start of your script
   const SecureStorage = (() => {
     let memoryStore = {};
     let useMemory = false;
     
     // Test localStorage availability
     try {
       localStorage.setItem('__test__', '1');
       localStorage.removeItem('__test__');
     } catch (e) {
       useMemory = true;
       console.warn('localStorage unavailable, using memory-only storage');
     }
     
     return {
       getItem: (key) => {
         try {
           return useMemory ? memoryStore[key] : localStorage.getItem(key);
         } catch (e) {
           return memoryStore[key];
         }
       },
       setItem: (key, value) => {
         try {
           if (useMemory) {
             memoryStore[key] = value;
           } else {
             localStorage.setItem(key, value);
           }
         } catch (e) {
           memoryStore[key] = value;
         }
       },
       removeItem: (key) => {
         try {
           if (useMemory) {
             delete memoryStore[key];
           } else {
             localStorage.removeItem(key);
           }
         } catch (e) {
           delete memoryStore[key];
         }
       },
       clear: () => {
         try {
           if (useMemory) {
             memoryStore = {};
           } else {
             localStorage.clear();
           }
         } catch (e) {
           memoryStore = {};
         }
       }
     };
   })();
   
   // ALWAYS use SecureStorage instead of localStorage:
   // SecureStorage.setItem('data', JSON.stringify(myData));
   // const data = JSON.parse(SecureStorage.getItem('data') || '[]');
   \`\`\`

9. **Error Handling**: Include proper validation and error handling for all user inputs
10. **Accessibility**: Follow basic accessibility best practices (ARIA labels, semantic HTML, keyboard navigation)
11. **Security**: Never use inline event handlers in HTML (use addEventListener), avoid eval(), sanitize user inputs

Generate ONLY the HTML code without any markdown formatting, explanations, or comments outside the code.`

/**
 * Basic HTML sanitization to prevent dangerous patterns
 * Note: This is a basic layer - artifacts are AI-generated with controlled prompts
 */
function sanitizeHtml(html: string): string {
    let sanitized = html

    // Remove external script sources (only allow inline scripts)
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']https?:\/\/[^"']*["'][^>]*>/gi, '')
    
    // Remove javascript: protocol URLs
    sanitized = sanitized.replace(/javascript:/gi, 'blocked:')
    
    // Remove data: URLs in script contexts (but allow in images)
    sanitized = sanitized.replace(/<script[^>]*src\s*=\s*["']data:[^"']*["'][^>]*>/gi, '')
    
    // Log if any sanitization occurred
    if (sanitized !== html) {
        console.warn('HTML sanitization applied: removed potentially dangerous patterns')
    }
    
    return sanitized
}

// Create artifact with AI-generated code
export async function createArtifact(data: {
    assistantId: string
    name: string
    instructions: string
    category: string
    permissions: 'private' | 'team' | 'public'
    selectedUsers: Array<{ id: string; name: string; email: string }>
    apiConfigs: Array<{ key: string; value: string }>
    uploadedFiles?: Array<{
        url: string
        name: string
        type: string
        size: number
        uploadedAt: string
        extractedContent?: {
            text: string
            html: string
            tables?: Array<{
                base64: string
                page: number
            }>
            metadata?: {
                pages: number
                model: string
            }
        }
        extractedImages?: Array<{
            id: string
            page: number
            coordinates?: any
        }>
        extractionError?: string
    }>
    uploadedImages?: Array<{
        url: string
        name: string
        type: string
        size: number
        uploadedAt: string
    }>
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(data.assistantId)

        // Check if user can create artifacts (only owners can create artifacts)
        const { canCreateArtifacts } = await import('@/lib/permissions/assistant-permissions')
        const canCreate = await canCreateArtifacts(assistantIdBigInt, userId)

        if (!canCreate) {
            return {
                success: false,
                error: 'Assistant not found or access denied'
            }
        }

        // Build enhanced instructions with extracted content
        let enhancedInstructions = data.instructions

        // Add document content
        if (data.uploadedFiles && data.uploadedFiles.length > 0) {
            enhancedInstructions += "\n\n=== EXTRACTED DOCUMENT CONTENT ===\n"
            
            data.uploadedFiles.forEach((file, idx) => {
                enhancedInstructions += `\n--- Document ${idx + 1}: ${file.name} ---\n`
                
                if (file.extractedContent) {
                    enhancedInstructions += `\nPages: ${file.extractedContent.metadata?.pages || "Unknown"}\n`
                    enhancedInstructions += `\nExtracted Text:\n${file.extractedContent.text}\n`
                    
                    // Add tables as base64 images
                    if (file.extractedContent.tables && file.extractedContent.tables.length > 0) {
                        enhancedInstructions += `\nTables (${file.extractedContent.tables.length}):\n`
                        file.extractedContent.tables.forEach((table, tableIdx) => {
                            enhancedInstructions += `Table ${tableIdx + 1} (Page ${table.page}): data:image/png;base64,${table.base64}\n`
                        })
                    }
                } else if (file.extractionError) {
                    enhancedInstructions += `\n[Content extraction failed for this document]\n`
                }
            })
            
            enhancedInstructions += "\n=== END DOCUMENT CONTENT ===\n"
        }

        // Add image URLs
        if (data.uploadedImages && data.uploadedImages.length > 0) {
            enhancedInstructions += "\n\n=== IMAGES TO EMBED ===\n"
            data.uploadedImages.forEach((img, idx) => {
                enhancedInstructions += `Image ${idx + 1}: ${img.url} (${img.name})\n`
            })
            enhancedInstructions += "=== END IMAGES ===\n"
        }

        // Generate artifact code using AI or video generation
        const model = 'gpt-5'
        
        let generatedCode: string
        let videoUrl: string | null = null
        let thumbnailUrl: string | null = null
        let videoMetadata: any = null

        // Check if this is a video generation artifact
        if (data.category === "video_generation") {
            console.log("[Artifact] Creating video generation artifact...")
            
            try {
                // Step 1: Generate video with OpenAI Sora
                const soraResult = await openAISoraService.generateVideo({
                    prompt: data.instructions,
                    model: "sora-2",
                    size: "1280x720",
                    seconds: "8",
                })

                console.log(`[Artifact] Video generated: ${soraResult.videoId}`)

                // Step 2: Upload to S3
                const s3Result = await s3VideoUploadService.uploadVideo(
                    soraResult.videoBuffer,
                    soraResult.thumbnailBuffer,
                    assistantIdBigInt,
                    data.name
                )

                videoUrl = s3Result.videoUrl
                thumbnailUrl = s3Result.thumbnailUrl
                videoMetadata = soraResult.metadata

                console.log(`[Artifact] Video uploaded to S3: ${videoUrl}`)

                // Step 3: Generate HTML with video player
                generatedCode = generateVideoArtifactHtml(
                    videoUrl,
                    thumbnailUrl,
                    data.name
                )

                console.log("[Artifact] Video artifact HTML generated successfully")
            } catch (videoError) {
                console.error("[Artifact] Video generation error:", videoError)
                return {
                    success: false,
                    error: videoError instanceof Error ? videoError.message : 'Failed to generate video with Sora'
                }
            }
        } else {
            // Existing logic for other artifact types
            try {
                const response = await openai.responses.create({
                    model: model,
                    reasoning: { effort: "high" },
                    instructions: ARTIFACT_GENERATION_PROMPT,
                    input: `Create a complete HTML artifact:\n\nName: ${data.name}\nCategory: ${data.category}\n\n${enhancedInstructions}\n\nGenerate the complete, production-ready HTML code now.`,
                })

                generatedCode = response.output_text

                if (!generatedCode) {
                    return {
                        success: false,
                        error: 'Failed to generate artifact code'
                    }
                }

                // Clean up markdown formatting
                generatedCode = generatedCode
                    .replace(/^```html\n?/i, "")
                    .replace(/^```\n?/i, "")
                    .replace(/\n?```$/i, "")
                    .trim()

                // Sanitize the generated HTML
                generatedCode = sanitizeHtml(generatedCode)

            } catch (aiError) {
                console.error('AI generation error:', aiError)
                return {
                    success: false,
                    error: 'Failed to generate artifact with AI'
                }
            }
        }

        // Prepare API keys JSON
        const apiKeysJson = data.apiConfigs.length > 0 
            ? data.apiConfigs.reduce((acc, config) => {
                if (config.key && config.value) {
                    acc[config.key] = config.value
                }
                return acc
            }, {} as Record<string, string>)
            : null

        // Determine if artifact is public
        const isPublic = data.permissions === 'public'

        // Create artifact in a transaction
        const artifact = await prisma.$transaction(async (tx) => {
            // Create the artifact
            const newArtifact = await tx.assistantArtifact.create({
                data: {
                    assistantId: assistantIdBigInt,
                    userId: userId,
                    name: data.name,
                    instructions: enhancedInstructions, // Store enhanced version
                    category: data.category,
                    code: generatedCode, // AI-generated HTML code
                    tools: undefined,
                    apiKeys: apiKeysJson || undefined,
                    files: data.uploadedFiles ? (data.uploadedFiles as any) : undefined,
                    images: data.uploadedImages ? (data.uploadedImages as any) : undefined,
                    videoUrl: videoUrl || undefined,
                    thumbnailUrl: thumbnailUrl || undefined,
                    videoMetadata: videoMetadata ? (videoMetadata as any) : undefined,
                    isPublic: isPublic
                }
            })

            // Create permissions for selected users (if permissions is 'team')
            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                await tx.artifactPermission.createMany({
                    data: data.selectedUsers.map(user => ({
                        userId: BigInt(user.id),
                        assistantId: assistantIdBigInt,
                        artifactId: newArtifact.id,
                        access: 'editor' // Default access level
                    }))
                })
            }

            return newArtifact
        })

        // Get all users with artifact permissions to notify
        const userIdsToNotify: string[] = []
        
        try {
            // Get assistant owner (always has artifact permissions)
            const assistant = await prisma.assistant.findUnique({
                where: { id: assistantIdBigInt },
                select: { userId: true }
            })
            
            if (assistant) {
                userIdsToNotify.push(assistant.userId.toString())
            }

            // Get all contacts with artifact permissions
            const contactsWithArtifactPermission = await prisma.assistantContact.findMany({
                where: {
                    assistantId: assistantIdBigInt,
                    OR: [
                        { access: 'admin' }, // Admins have all permissions
                        {
                            AND: [
                                { permissions: { not: null } },
                                {
                                    permissions: {
                                        contains: '"artifacts"' // Check for "artifacts" in JSON array
                                    }
                                }
                            ]
                        }
                    ]
                },
                select: {
                    userId: true,
                    permissions: true
                }
            })

            // Add contact user IDs to the list
            for (const contact of contactsWithArtifactPermission) {
                const userIdStr = contact.userId.toString()
                if (!userIdsToNotify.includes(userIdStr)) {
                    userIdsToNotify.push(userIdStr)
                }
            }

            // If artifact is 'team' and has selected users, add them too
            if (data.permissions === 'team' && data.selectedUsers.length > 0) {
                for (const user of data.selectedUsers) {
                    if (!userIdsToNotify.includes(user.id)) {
                        userIdsToNotify.push(user.id)
                    }
                }
            }

            // Send notifications
            const notificationService = (await import('@/lib/services/notifactionService')).default
            await notificationService.notifyArtifactCreated(
                artifact.id.toString(),
                data.assistantId,
                session.user.id,
                userIdsToNotify
            )
        } catch (notificationError) {
            console.error('Error sending artifact creation notifications:', notificationError)
            // Don't fail the operation if notification fails
        }

        return {
            success: true,
            artifact: {
                id: artifact.id,
                name: artifact.name,
                category: artifact.category
            }
        }

    } catch (error) {
        console.error('Error creating artifact:', error)
        
        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            }
        }

        return {
            success: false,
            error: 'Failed to create artifact'
        }
    }
}

// Get artifacts for an assistant with permission checks
export async function getArtifacts(assistantId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                artifacts: []
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)

        // Fetch artifacts where:
        // 1. User is the creator (userId matches)
        // 2. User has permission (in ArtifactPermission table)
        // 3. Artifact is public (isPublic = true)
        const artifacts = await prisma.assistantArtifact.findMany({
            where: {
                assistantId: assistantIdBigInt,
                OR: [
                    { userId: userId }, // User is the creator
                    {
                        permissions: {
                            some: {
                                userId: userId // User has explicit permission
                            }
                        }
                    },
                    { isPublic: true } // Artifact is public
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                permissions: {
                    where: {
                        userId: userId
                    },
                    select: {
                        access: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedArtifacts = artifacts.map(artifact => ({
            id: artifact.id.toString(),
            name: artifact.name || 'Untitled Artifact',
            category: artifact.category || 'others',
            htmlContent: artifact.code || '',
            createdAt: artifact.createdAt,
            creator: {
                id: artifact.user.id.toString(),
                name: artifact.user.name || 'Unknown User',
                email: artifact.user.email,
                image: artifact.user.image
            },
            isOwner: artifact.userId === userId,
            access: artifact.userId === userId 
                ? 'admin' 
                : artifact.permissions[0]?.access || 'viewer',
            isPublic: artifact.isPublic
        }))

        return {
            success: true,
            artifacts: formattedArtifacts
        }

    } catch (error) {
        console.error('Error fetching artifacts:', error)
        return {
            success: false,
            error: 'Failed to fetch artifacts',
            artifacts: []
        }
    }
}

// Get single artifact with permission check
export async function getArtifactById(artifactId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required',
                artifact: null
            }
        }

        const userId = BigInt(session.user.id)
        const artifactIdInt = parseInt(artifactId)

        // Fetch artifact with permission check
        const artifact = await prisma.assistantArtifact.findFirst({
            where: {
                id: artifactIdInt,
                OR: [
                    { userId: userId }, // User is the creator
                    {
                        permissions: {
                            some: {
                                userId: userId // User has explicit permission
                            }
                        }
                    },
                    { isPublic: true } // Artifact is public
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                permissions: {
                    where: {
                        userId: userId
                    },
                    select: {
                        access: true
                    }
                }
            }
        })

        if (!artifact) {
            return {
                success: false,
                error: 'Artifact not found or access denied',
                artifact: null
            }
        }

        return {
            success: true,
            artifact: {
                id: artifact.id.toString(),
                name: artifact.name || 'Untitled Artifact',
                category: artifact.category || 'others',
                htmlContent: artifact.code || '',
                instructions: artifact.instructions || '',
                createdAt: artifact.createdAt,
                updatedAt: artifact.updatedAt,
                creator: {
                    id: artifact.user.id.toString(),
                    name: artifact.user.name || 'Unknown User',
                    email: artifact.user.email,
                    image: artifact.user.image
                },
                isOwner: artifact.userId === userId,
                access: artifact.userId === userId 
                    ? 'admin' 
                    : artifact.permissions[0]?.access || 'viewer',
                isPublic: artifact.isPublic,
                apiKeys: artifact.apiKeys as Record<string, string> | null
            }
        }

    } catch (error) {
        console.error('Error fetching artifact:', error)
        return {
            success: false,
            error: 'Failed to fetch artifact',
            artifact: null
        }
    }
}

/**
 * Delete file from S3
 */
export async function deleteArtifactFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        await deleteFromS3(fileUrl)
        return { success: true }
    } catch (error) {
        console.error('Error deleting file from S3:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete file'
        }
    }
}
