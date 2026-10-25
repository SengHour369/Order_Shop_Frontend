import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { AssistantApi } from '../assistant.api';

/** Scoped to the existing chat so media cannot outlive its owner. */
@Injectable()
export class ChatVoice {
  private api = inject(AssistantApi);
  readonly recording = signal(false);
  readonly pending = signal(false);
  readonly seconds = signal(0);
  readonly levels = signal<number[]>([2,2,2,2,2,2,2,2]);
  readonly error = signal('');
  readonly speaking = signal('');
  readonly paused = signal(false);
  readonly autoPlay = signal(false);
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private context?: AudioContext;
  private frame = 0;
  private timer?: ReturnType<typeof setInterval>;
  private request?: Subscription;
  private generation = 0;
  private utterance?: SpeechSynthesisUtterance;
  constructor() { inject(DestroyRef).onDestroy(() => this.reset()); }
  async start(language: string, review: (text: string) => void) {
    if (this.pending() || this.recording()) return;
    this.stopSpeech(); this.error.set('');
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Voice recording needs HTTPS and a browser that supports microphone recording. You can still type.'); return;
    }
    const type = ['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t));
    if (!type) { this.error.set('Recording is unsupported in this browser. Please type your message.'); return; }
    const generation = ++this.generation;
    this.pending.set(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      const recorder = this.recorder = new MediaRecorder(stream, {mimeType:type});
      const chunks: Blob[] = []; let size = 0;
      recorder.ondataavailable = event => {
        if (generation !== this.generation) return;
        size += event.data.size;
        if (size > 5 * 1024 * 1024) { this.reset(); this.error.set('Recording exceeds 5 MB. Please try a shorter question.'); }
        else if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => { this.reset(); this.error.set('Recording failed. Please try again.'); };
      recorder.onstop = () => {
        this.releaseMedia();
        if (generation !== this.generation) return;
        this.pending.set(false);
        const blob = new Blob(chunks, {type});
        if (!blob.size) { this.error.set('No audio recorded. Please try again.'); return; }
        this.pending.set(true);
        this.request = this.api.transcribe(blob, language === 'km' ? 'km' : 'en').pipe(timeout(50000)).subscribe({
          next: result => {
            this.pending.set(false);
            if (generation !== this.generation) return;
            if (!result.text?.trim()) { this.error.set('No speech detected. Please try again.'); return; }
            review(result.text);
          },
          error: error => {
            this.pending.set(false);
            const status = error?.status;
            const message = typeof error?.error?.message === 'string' ? error.error.message.slice(0, 300) : '';
            this.error.set(status === 401 || status === 403 ? 'Please sign in to use voice transcription.'
              : status === 429 ? 'Free transcription quota or rate limit reached. Please wait before trying again.'
              : status === 504 ? message || 'Voice transcription timed out. Please try a shorter recording.'
              : status === 503 ? message || 'Voice transcription is unavailable. Please type your message.'
              : status === 422 ? 'No clear speech detected. Please try recording again.'
              : 'Could not transcribe your recording. Please try again or type your message.');
          },
        });
      };
      this.pending.set(false); this.seconds.set(0); this.recording.set(true);
      recorder.start(250);
      this.timer = setInterval(() => { this.seconds.update(n => n + 1); if (this.seconds() >= 60) this.finish(); }, 1000);
      // The waveform reflects microphone levels; recording still works if analysis is unavailable.
      try {
        this.context = new AudioContext();
        const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
        this.context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          analyser.getByteFrequencyData(samples);
          this.levels.set(Array.from({length:8}, (_, i) => Math.max(2, samples[i * 8] / 9)));
          this.frame = requestAnimationFrame(draw);
        }; draw();
      } catch { /* Meter is optional; retain recording and timer. */ }
    } catch (error) {
      if (generation !== this.generation) return;
      this.releaseMedia(); this.pending.set(false);
      this.error.set(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone permission denied. Allow microphone access in browser settings or type your message.' : 'Microphone unavailable. Check your device or type your message.');
    }
  }
  finish() { if (this.recorder?.state === 'recording') { this.pending.set(true); this.recorder.stop(); this.releaseMedia(); } }
  private releaseMedia() {
    this.recording.set(false);
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    clearInterval(this.timer); cancelAnimationFrame(this.frame);
    void this.context?.close().catch(() => {}); this.context = undefined;
  }
  reset() {
    ++this.generation; this.request?.unsubscribe();
    if (this.recorder && this.recorder.state !== 'inactive') { this.recorder.onstop = null; this.recorder.stop(); }
    this.recorder = undefined; this.releaseMedia(); this.pending.set(false); this.stopSpeech();
  }
  play(text: string) {
    this.stopSpeech(); this.error.set('');
    if (typeof speechSynthesis === 'undefined') { this.error.set('Speech playback is unsupported on this device.'); return; }
    const lang = /[\u1780-\u17ff]/.test(text) ? 'km' : 'en';
    const voice = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(lang));
    if (!voice) { this.error.set(`No ${lang === 'km' ? 'Khmer' : 'English'} speech voice is available on this device. Please check your system voice settings.`); return; }
    const utterance = this.utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice; utterance.lang = voice.lang;
    utterance.onend = () => { if (this.utterance === utterance) { this.speaking.set(''); this.paused.set(false); } };
    utterance.onerror = () => { if (this.utterance === utterance) { this.speaking.set(''); this.error.set('Speech playback failed. Please try again.'); } };
    this.speaking.set(text); speechSynthesis.speak(utterance);
  }
  togglePause() {
    if (!this.speaking()) return;
    if (this.paused()) speechSynthesis.resume(); else speechSynthesis.pause();
    this.paused.update(value => !value);
  }
  stopSpeech() {
    this.utterance = undefined;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.speaking.set(''); this.paused.set(false);
  }
}
