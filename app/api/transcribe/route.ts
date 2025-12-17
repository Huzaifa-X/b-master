import { NextRequest } from "next/server"
import { openai } from "@/lib/openai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Check authentication
                const session = await getServerSession(authOptions)
                if (!session?.user?.id) {
                    console.error("[Transcribe API] Unauthorized - no session")
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Unauthorized" })}\n\n`)
                    )
                    controller.close()
                    return
                }

                // Check if OpenAI API key is configured
                if (!process.env.OPENAI_API_KEY) {
                    console.error("[Transcribe API] OPENAI_API_KEY not configured")
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "OpenAI API key not configured" })}\n\n`)
                    )
                    controller.close()
                    return
                }

                console.log("[Transcribe API] Request received from user:", session.user.id)

                const formData = await req.formData()
                const audio = formData.get("audio") as Blob
                const language = formData.get("language") as string || "auto"

                if (!audio) {
                    console.error("[Transcribe API] No audio file provided")
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "No audio file" })}\n\n`)
                    )
                    controller.close()
                    return
                }

                console.log("[Transcribe API] Audio file received:", {
                    size: audio.size,
                    type: audio.type,
                    language
                })

                // Check file size (OpenAI has a 25MB limit)
                if (audio.size > 25 * 1024 * 1024) {
                    console.error("[Transcribe API] Audio file too large:", audio.size)
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Audio file too large. Maximum size is 25MB." })}\n\n`)
                    )
                    controller.close()
                    return
                }

                console.log("[Transcribe API] Calling OpenAI Whisper API...")

                // Create a proper File object for OpenAI SDK
                // The OpenAI SDK expects a file-like object with name, type, and arrayBuffer() method
                const audioBuffer = await audio.arrayBuffer()
                const audioFile = new Blob([audioBuffer], { type: audio.type || "audio/webm" })
                
                // Add name property to the Blob to make it File-like
                Object.defineProperty(audioFile, 'name', {
                    value: 'recording.webm',
                    writable: false
                })

                // Use whisper-1 for transcription
                const transcription = await openai.audio.transcriptions.create({
                    file: audioFile as any, // Cast to any since we're adding the name property
                    model: "whisper-1",
                    language: language === "auto" ? undefined : language,
                    response_format: "text",
                })

                console.log("[Transcribe API] Transcription successful, length:", transcription?.length || 0)

                // Send the transcription result
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: transcription })}\n\n`)
                )

                // Send done signal
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                controller.close()

            } catch (error) {
                console.error("[Transcribe API] Transcription error:", error)
                const errorMessage = error instanceof Error ? error.message : "Transcription failed"
                const errorDetails = error instanceof Error ? error.stack : String(error)
                console.error("[Transcribe API] Error details:", errorDetails)
                
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({ 
                            error: errorMessage
                        })}\n\n`
                    )
                )
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    })
}