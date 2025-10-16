"use client";

import { Mic, MicOff } from "lucide-react";
import { useComposerRuntime } from "@assistant-ui/react";
import type { FC } from "react";
import { useState, useEffect, useRef } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

export const DictateButton: FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionType>(null);
    const isListeningRef = useRef(false);
    
    // Use composer runtime since we're inside ComposerPrimitive.Root
    const composerRuntime = useComposerRuntime();

    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== "undefined") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const windowWithSpeech = window as any;
            const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

            if (SpeechRecognition) {
                setIsSupported(true);
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onresult = (event: any) => {
                    let finalTranscript = "";

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        console.log(transcript)
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + " ";
                        }
                    }

                    if (finalTranscript) {
                        // Access composer state directly
                        const currentText = composerRuntime.getState().text;
                        composerRuntime.setText(currentText + finalTranscript);
                    }
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        setIsListening(false);
                        isListeningRef.current = false;
                    }
                };

                recognition.onend = () => {
                    // Restart if user still wants to listen
                    if (isListeningRef.current) {
                        try {
                            recognition.start();
                        } catch {
                            setIsListening(false);
                            isListeningRef.current = false;
                        }
                    } else {
                        setIsListening(false);
                    }
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            isListeningRef.current = false;
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore errors on cleanup
                }
                recognitionRef.current = null;
            }
        };
    }, [composerRuntime]);

    const toggleDictation = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            try {
                isListeningRef.current = false;
                recognitionRef.current.stop();
            } catch (error) {
                console.error("Error stopping recognition:", error);
            }
            setIsListening(false);
        } else {
            try {
                isListeningRef.current = true;
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error("Error starting recognition:", error);
                isListeningRef.current = false;
                setIsListening(false);
            }
        }
    };

    if (!isMounted || !isSupported) {
        return null;
    }

    return (
        <TooltipIconButton
            tooltip={isListening ? "Stop dictating" : "Start dictating"}
            side="bottom"
            type="button"
            variant={isListening ? "default" : "ghost"}
            size="icon"
            className={`aui-composer-dictate size-[34px] rounded-full p-1 ${isListening ? "bg-red-500 hover:bg-red-600" : ""}`}
            aria-label={isListening ? "Stop dictating" : "Start dictating"}
            onClick={toggleDictation}
        >
            {isListening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </TooltipIconButton>
    );
};