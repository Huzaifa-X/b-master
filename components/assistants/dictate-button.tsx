"use client"

import { Mic, MicOff, Loader2 } from "lucide-react"
import type { FC } from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface DictateButtonProps {
    onTranscript?: (text: string) => void
    onStreamingTranscript?: (text: string) => void // For real-time updates
    disabled?: boolean
    language?: "en" | "fr" | "auto" // Support for English, French, or auto-detect
}

export const DictateButton: FC<DictateButtonProps> = ({
    onTranscript,
    onStreamingTranscript,
    disabled = false,
    language = "auto"
}) => {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            })

            streamRef.current = stream

            // Use webm with opus codec for better quality
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'

            const mediaRecorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            // Collect audio chunks
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            // When recording stops, transcribe
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: mimeType })
                await transcribeAudio(audioBlob)

                // Clean up stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                    streamRef.current = null
                }
            }

            // Start recording
            mediaRecorder.start()
            setIsRecording(true)
        } catch (error) {
            console.error("Error starting recording:", error)
            alert("Could not access microphone. Please check permissions.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsProcessing(true)
        try {
            const formData = new FormData()
            formData.append("audio", audioBlob, "recording.webm")
            formData.append("language", language)

            console.log("[Dictate] Sending transcription request...", {
                size: audioBlob.size,
                type: audioBlob.type,
                language
            })

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText)
                console.error("[Dictate] Response error:", response.status, errorText)

                if (response.status === 401) {
                    throw new Error("Authentication required. Please sign in again.")
                } else if (response.status === 500) {
                    throw new Error("Server error. Please try again later.")
                } else {
                    throw new Error(`Transcription failed: ${errorText || response.statusText}`)
                }
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error("No response body")
            }

            let accumulatedText = ""
            let hasError = false
            let lineBuffer = ""

            // Read the stream
            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                lineBuffer += chunk

                const lines = lineBuffer.split('\n')
                lineBuffer = lines.pop() || "" // Keep the last partial line in the buffer

                for (const line of lines) {
                    const trimmedLine = line.trim()
                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.slice(6).trim()

                        if (data === '[DONE]') {
                            // Final transcript
                            if (!hasError && onTranscript && accumulatedText) {
                                console.log("[Dictate] Transcription complete:", accumulatedText.length, "characters")
                                onTranscript(accumulatedText)
                            }
                            continue
                        }

                        try {
                            const parsed = JSON.parse(data)

                            if (parsed.error) {
                                hasError = true
                                console.error("[Dictate] Transcription error:", parsed.error)
                                throw new Error(parsed.error)
                            }

                            if (parsed.text) {
                                accumulatedText = parsed.text
                                // Stream partial results to input box
                                if (onStreamingTranscript) {
                                    onStreamingTranscript(parsed.text)
                                }
                            }
                        } catch (e) {
                            // If it's our thrown error, re-throw it
                            if (e instanceof Error && (
                                e.message.includes("Transcription") ||
                                e.message.includes("Authentication") ||
                                e.message.includes("Server")
                            )) {
                                throw e
                            }
                            // Otherwise, skip invalid JSON
                            console.warn("[Dictate] Failed to parse JSON:", e, "Line:", line)
                        }
                    }
                }
            }
        } catch (error) {
            console.error("[Dictate] Error transcribing audio:", error)
            const errorMessage = error instanceof Error
                ? error.message
                : "Transcription failed. Please try again."
            alert(errorMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={isRecording ? "default" : "ghost"}
                        size="icon"
                        className={`size-[34px] rounded-full p-1 ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""
                            } ${isProcessing ? "opacity-50" : ""}`}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                        onClick={toggleRecording}
                        disabled={disabled || isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="size-5 animate-spin" />
                        ) : isRecording ? (
                            <MicOff className="size-5" />
                        ) : (
                            <Mic className="size-5" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    {isProcessing
                        ? "Processing..."
                        : isRecording
                            ? "Stop recording (click to transcribe)"
                            : "Start recording"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}