// Modular Speech Recognition Service
// Supports Web Speech API (Chrome, Edge, Safari, Android) and MediaRecorder Server Fallback
// Designed for production POS cash counters

export type SpeechLanguage = 'en-IN' | 'ta-IN' | 'en-US';

export interface SpeechRecognitionOptions {
  language?: SpeechLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (errorMessage: string, isPermissionError?: boolean) => void;
  onStateChange?: (state: 'IDLE' | 'LISTENING' | 'PROCESSING') => void;
  preferredEngine?: 'AUTO' | 'BROWSER' | 'SERVER';
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isListening: boolean = false;
  private activeOptions: SpeechRecognitionOptions | null = null;
  private timeoutId: any = null;

  /**
   * Check if the browser natively supports the Web Speech API
   */
  public static isBrowserSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Check if MediaRecorder is supported for audio streaming
   */
  public static isMediaRecorderSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  /**
   * Start listening for voice commands
   */
  public async startListening(options: SpeechRecognitionOptions): Promise<void> {
    this.stopListening();
    this.activeOptions = options;
    const lang = options.language || 'en-IN';
    const useServer =
      options.preferredEngine === 'SERVER' ||
      (!SpeechRecognitionService.isBrowserSpeechSupported() &&
        SpeechRecognitionService.isMediaRecorderSupported());

    if (useServer) {
      await this.startMediaRecorder(options);
    } else if (SpeechRecognitionService.isBrowserSpeechSupported()) {
      this.startBrowserRecognition(options, lang);
    } else {
      options.onError(
        'Speech recognition is not supported in this browser. Please use Chrome, Edge, or enter text manually.'
      );
    }
  }

  /**
   * Browser Web Speech API implementation
   */
  private startBrowserRecognition(options: SpeechRecognitionOptions, lang: string): void {
    try {
      const SpeechClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechClass();
      this.recognition.lang = lang;
      this.recognition.continuous = options.continuous !== false;
      this.recognition.interimResults = options.interimResults !== false;
      this.recognition.maxAlternatives = 1;

      options.onStateChange?.('LISTENING');
      this.isListening = true;

      // Rolling timeout (45s for continuous, 15s for single)
      const sessionTimeout = options.continuous !== false ? 45000 : 15000;
      const resetTimeout = () => {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
          if (this.isListening) {
            this.stopListening();
          }
        }, sessionTimeout);
      };
      resetTimeout();

      let finalAccumulator = '';

      this.recognition.onresult = (event: any) => {
        resetTimeout();
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalAccumulator += ' ' + transcript;
          } else {
            interim += transcript;
          }
        }

        const fullPreview = (finalAccumulator + ' ' + interim).trim();
        if (interim && options.onInterim) {
          options.onInterim(fullPreview);
        }

        if (finalAccumulator.trim()) {
          options.onFinal(finalAccumulator.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          options.onError(
            'Microphone access was denied. Please allow microphone permissions in browser settings.',
            true
          );
        } else if (event.error === 'no-speech') {
          options.onError('No speech detected. Please speak closer to the microphone and retry.');
        } else if (event.error === 'network') {
          options.onError('Network connection error during voice recognition. Falling back to manual search.');
        } else {
          options.onError(`Voice recognition error: ${event.error}`);
        }
        this.cleanup();
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          this.cleanup();
          options.onStateChange?.('IDLE');
        }
      };

      this.recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize browser speech recognition:', err);
      options.onError('Failed to start microphone. Please check browser permissions.');
      this.cleanup();
    }
  }

  /**
   * MediaRecorder server transcription implementation (fallback)
   */
  private async startMediaRecorder(options: SpeechRecognitionOptions): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        options.onStateChange?.('PROCESSING');
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        await this.sendAudioToServer(audioBlob, options);
        this.cleanup();
        options.onStateChange?.('IDLE');
      };

      options.onStateChange?.('LISTENING');
      this.isListening = true;
      this.mediaRecorder.start();

      // 10-second auto-stop for media recorder
      this.timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, 10000);
    } catch (err: any) {
      console.error('MediaRecorder error:', err);
      const isPerm = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      options.onError(
        isPerm
          ? 'Microphone permission denied. Please allow microphone access or continue with manual search.'
          : 'Could not access microphone hardware.',
        isPerm
      );
      this.cleanup();
    }
  }

  /**
   * Dispatch audio payload to server transcription API
   */
  private async sendAudioToServer(blob: Blob, options: SpeechRecognitionOptions): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('language', options.language || 'en-IN');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.transcript) {
        options.onFinal(data.transcript);
      } else if (data.isFallbackNotice) {
        options.onError('Please speak into a Web Speech-supported browser (Chrome/Edge) or type manually.');
      } else {
        options.onError(data.error || 'No speech could be recognized.');
      }
    } catch (err: any) {
      console.error('Error posting audio to server:', err);
      options.onError('Failed to connect to speech transcription service.');
    }
  }

  /**
   * Stop active listening session
   */
  public stopListening(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    this.cleanup();
  }

  /**
   * Abort listening session immediately without emitting results
   */
  public abortListening(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.isListening = false;
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }
}
