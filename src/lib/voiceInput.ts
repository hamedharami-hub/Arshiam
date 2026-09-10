// Native Android speech recognition with a Web Speech API fallback.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { loadOfflineModelSettings, type OfflineSpeechModelId } from "./offlineModels";
import { isOfflineSpeechRecording, startOfflineSpeech, stopOfflineSpeech } from "./offlineSpeech";

type VoiceLang = "fa-IR" | "en-US";
type NativeSpeechResult = { transcript: string; confidence?: number };
const nativeSpeech = registerPlugin<{
  start(options: { language: VoiceLang; preferOffline: boolean }): Promise<NativeSpeechResult>;
  stop(): Promise<void>;
}>("ArshnazSpeech");

type VoiceInputOptions = {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  continuous?: boolean;
};

export class VoiceInput {
  private recognition: any = null;
  private isListening = false;
  private options: VoiceInputOptions;
  private readonly nativeAndroid = Capacitor.getPlatform() === "android";

  constructor(options: VoiceInputOptions) {
    this.options = options;
    this.init();
  }

  private init() {
    if (this.nativeAndroid) return;
    if (typeof window === "undefined" || (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window))) {
      this.options.onError?.("Voice input not supported in this browser");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.options.continuous ?? false;
    this.recognition.interimResults = true;
    this.recognition.lang = "fa-IR";

    this.recognition.onstart = () => {
      this.isListening = true;
      this.options.onListeningChange?.(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.options.onListeningChange?.(false);
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.options.onTranscript(finalTranscript);
      }
      if (interimTranscript) {
        this.options.onInterim?.(interimTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.options.onListeningChange?.(false);
      const error = event.error;
      if (error === "not-allowed") {
        this.options.onError?.("Microphone permission denied");
      } else if (error === "no-speech") {
        this.options.onError?.("No speech detected");
      } else if (error === "aborted") {
        // User or code stopped; no need to show an error.
      } else {
        this.options.onError?.(`Voice error: ${error}`);
      }
    };
  }

  start(lang: VoiceLang = "fa-IR") {
    const offlineModel = this.offlineSpeechModel();
    if (offlineModel) {
      if (this.isListening) this.stop();
      this.isListening = true;
      this.options.onListeningChange?.(true);
      void startOfflineSpeech(offlineModel, lang)
        .catch((error) => {
          this.isListening = false;
          this.options.onListeningChange?.(false);
          this.options.onError?.(error instanceof Error ? error.message : "Offline speech failed");
        });
      return;
    }
    if (this.nativeAndroid) {
      if (this.isListening) this.stop();
      this.isListening = true;
      this.options.onListeningChange?.(true);
      void nativeSpeech.start({ language: lang, preferOffline: false })
        .then(({ transcript }) => {
          if (transcript.trim()) this.options.onTranscript(transcript.trim());
        })
        .catch((error: { code?: string; message?: string }) => {
          if (error?.code !== "ABORTED") {
            this.options.onError?.(this.nativeErrorMessage(error));
          }
        })
        .finally(() => {
          this.isListening = false;
          this.options.onListeningChange?.(false);
        });
      return;
    }
    if (!this.recognition) {
      this.options.onError?.("Voice input not supported");
      return;
    }
    if (this.isListening) {
      this.stop();
    }
    this.recognition.lang = lang;
    this.recognition.start();
  }

  stop() {
    if (isOfflineSpeechRecording()) {
      void stopOfflineSpeech()
        .then((transcript) => { if (transcript.trim()) this.options.onTranscript(transcript.trim()); })
        .catch((error) => this.options.onError?.(error instanceof Error ? error.message : "Offline speech failed"))
        .finally(() => { this.isListening = false; this.options.onListeningChange?.(false); });
      return;
    }
    if (this.nativeAndroid) {
      if (this.isListening) void nativeSpeech.stop().catch(() => undefined);
      this.isListening = false;
      this.options.onListeningChange?.(false);
      return;
    }
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  toggle(lang: VoiceLang = "fa-IR") {
    if (this.isListening) {
      this.stop();
    } else {
      this.start(lang);
    }
  }

  isSupported(): boolean {
    return this.nativeAndroid || !!this.recognition;
  }

  private nativeErrorMessage(error: { code?: string; message?: string }): string {
    switch (error?.code) {
      case "PERMISSION_DENIED": return "Microphone permission denied";
      case "NO_SPEECH": case "NO_MATCH": return "No speech detected";
      case "NETWORK": case "NETWORK_TIMEOUT": return "Speech service needs internet or an installed offline language pack";
      case "UNAVAILABLE": return "Speech recognition service unavailable";
      case "BUSY": return "Speech recognition is busy; please try again";
      default: return error?.message || "Voice input failed";
    }
  }

  private offlineSpeechModel(): OfflineSpeechModelId | null {
    const mode = loadOfflineModelSettings().speechMode;
    return mode === "whisper-tiny" || mode === "whisper-base" ? mode : null;
  }
}
