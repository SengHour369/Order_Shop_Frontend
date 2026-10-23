/** Streaming box-filter downsampling preserves fractional input positions across chunks. */
export class Pcm16Encoder {
  private sum = 0;
  private weight = 0;
  constructor(private readonly inputRate: number, private readonly outputRate = 16000) {}
  encode(input: Float32Array): {data: string; level: number} {
    const ratio = this.inputRate / this.outputRate;
    const samples: number[] = []; let energy = 0;
    for (const sample of input) {
      energy += sample * sample;
      let remaining = 1;
      while (remaining > 1e-9) {
        const part = Math.min(remaining, ratio - this.weight);
        this.sum += sample * part; this.weight += part; remaining -= part;
        if (this.weight >= ratio - 1e-9) {
          const value = Math.max(-1, Math.min(1, this.sum / ratio));
          samples.push(Math.round(value * (value < 0 ? 32768 : 32767)));
          this.sum = 0; this.weight = 0;
        }
      }
    }
    const bytes = new Uint8Array(samples.length * 2); const view = new DataView(bytes.buffer);
    samples.forEach((value, i) => view.setInt16(i * 2, value, true));
    return {data: btoa(String.fromCharCode(...bytes)), level: Math.sqrt(energy / Math.max(1, input.length))};
  }
}
export function decodePcm16(data: string): Float32Array<ArrayBuffer> {
  const binary = atob(data);
  if (binary.length % 2) throw new Error('Invalid PCM audio');
  const samples = new Float32Array(binary.length / 2);
  for (let i = 0; i < samples.length; i++) {
    const value = binary.charCodeAt(i * 2) | binary.charCodeAt(i * 2 + 1) << 8;
    samples[i] = (value >= 32768 ? value - 65536 : value) / 32768;
  }
  return samples;
}
