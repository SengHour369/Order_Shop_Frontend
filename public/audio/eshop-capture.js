/* Audio remains in memory. No recordings or network requests in this worklet. */
class EshopCapture extends AudioWorkletProcessor {
  constructor() { super(); this.chunk = new Float32Array(2048); this.offset = 0; }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) for (const value of channel) {
      this.chunk[this.offset++] = value;
      if (this.offset === this.chunk.length) {
        this.port.postMessage(this.chunk, [this.chunk.buffer]);
        this.chunk = new Float32Array(2048); this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('eshop-capture', EshopCapture);
