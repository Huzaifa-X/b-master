"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { openai } from "@/lib/openai"
import prisma from "@/lib/prisma"
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

        // Fetch all contacts for this assistant (excluding the current user/owner)
        const contacts = await prisma.assistantContact.findMany({
            where: {
                assistantId: assistantIdBigInt,
                userId: {
                    not: userId // Exclude the current user
                }
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

const ARTIFACT_GENERATION_PROMPT = `You are an expert web developer specializing in creating interactive, production-ready HTML/CSS/JavaScript applications.

Your task is to generate complete, self-contained HTML artifacts based on the provided instructions. Follow these guidelines:

1. **Complete HTML Document**: Generate a full HTML document with <!DOCTYPE html>, proper head section, and body
2. **Embedded Styles**: Include all CSS in a <style> tag within the head
3. **Embedded Scripts**: Include all JavaScript in a <script> tag before closing </body>
4. **Self-Contained**: No external dependencies - everything must work standalone
5. **Modern Design**: Use modern, clean UI design with proper spacing, colors, and typography
6. **Responsive**: Ensure the artifact works on all screen sizes
7. **Interactive**: Implement all required functionality with proper event handlers
8. **Data Management**: Use localStorage for data persistence when appropriate
9. **Error Handling**: Include proper validation and error handling
10. **Accessibility**: Follow basic accessibility best practices

Generate ONLY the HTML code without any markdown formatting, explanations, or comments outside the code.`

// Create artifact with AI-generated code
export async function createArtifact(data: {
    assistantId: string
    name: string
    instructions: string
    category: string
    permissions: 'private' | 'team' | 'public'
    selectedUsers: Array<{ id: string; name: string; email: string }>
    apiConfigs: Array<{ key: string; value: string }>
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
                error: 'Assistant not found or access denied'
            }
        }

        // Generate artifact code using AI
        const model = 'gpt-5'
        
        let generatedCode: string
        try {
            const response = await openai.responses.create({
                model: model,
                reasoning: { effort: "high" },
                instructions: ARTIFACT_GENERATION_PROMPT,
                input: `Generate a complete HTML artifact based on these instructions:\n\nName: ${data.name}\nCategory: ${data.category}\n\nInstructions:\n${data.instructions}\n\nGenerate the complete HTML code now.`,
            })

            generatedCode = response.output_text

            if (!generatedCode) {
                return {
                    success: false,
                    error: 'Failed to generate artifact code'
                }
            }
        } catch (aiError) {
            console.error('AI generation error:', aiError)
            return {
                success: false,
                error: 'Failed to generate artifact with AI'
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
                    instructions: data.instructions,
                    category: data.category,
                    code: generatedCode, // AI-generated HTML code
                    tools: undefined,
                    apiKeys: apiKeysJson || undefined,
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
