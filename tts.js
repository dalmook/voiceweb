function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BrowserTTSProvider {
  constructor() {
    this.synth = window.speechSynthesis;
  }

  listVoices() {
    return this.synth.getVoices();
  }

  stop() {
    this.synth.cancel();
  }

  speak(text, options = {}) {
    const { voice, rate = 1, pitch = 1, lang = "en-US" } = options;

    return new Promise((resolve, reject) => {
      if (!text) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = lang;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error || new Error("TTS error"));

      this.synth.speak(utterance);
    });
  }
}

export class TTSService {
  constructor(provider) {
    this.provider = provider;
    this.cancelled = false;
  }

  setProvider(provider) {
    this.provider = provider;
  }

  listVoices() {
    return this.provider.listVoices();
  }

  stop() {
    this.cancelled = true;
    this.provider.stop();
  }

  async speakSequence(chunks, options = {}, callbacks = {}) {
    const { repeat = 1, pauseMs = 800 } = options;
    const { onChunkStart, onChunkEnd } = callbacks;

    this.cancelled = false;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      for (let r = 0; r < repeat; r += 1) {
        if (this.cancelled) return;

        if (onChunkStart) onChunkStart(chunk, i, r);
        await this.provider.speak(chunk, options);
        if (onChunkEnd) onChunkEnd(chunk, i, r);

        if (this.cancelled) return;
        if (pauseMs > 0) await delay(pauseMs);
      }
    }
  }
}

export function createDefaultTTSService() {
  const browserProvider = new BrowserTTSProvider();
  return new TTSService(browserProvider);
}
