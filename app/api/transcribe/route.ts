import { NextRequest } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const formData = await req.formData()
                const audio = formData.get("audio") as Blob
                const language = formData.get("language") as string || "auto"

                if (!audio) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "No audio file" })}\n\n`)
                    )
                    controller.close()
                    return
                }

                // Check file size (OpenAI has a 25MB limit)
                if (audio.size > 25 * 1024 * 1024) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: "Audio file too large. Maximum size is 25MB." })}\n\n`)
                    )
                    controller.close()
                    return
                }

                // Convert Blob to File
                const file = new File([audio], "recording.webm", { 
                    type: audio.type || "audio/webm" 
                })

                // Use whisper-1 for transcription
                const transcription = await openai.audio.transcriptions.create({
                    file: file,
                    model: "gpt-4o-mini-transcribe",
                    language: language === "auto" ? undefined : language,
                    response_format: "text",
                })

                // Send the transcription result
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: transcription })}\n\n`)
                )

                // Send done signal
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                controller.close()

            } catch (error) {
                console.error("Transcription error:", error)
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({ 
                            error: error instanceof Error ? error.message : "Transcription failed" 
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