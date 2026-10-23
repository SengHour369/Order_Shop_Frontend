import { Pcm16Encoder, decodePcm16 } from './live-audio';
describe('Gemini live PCM audio',()=>{
  it('encodes signed little-endian samples with clamping',()=>{
    const result=new Pcm16Encoder(16000).encode(new Float32Array([-2,-1,0,1,2]));
    const samples=decodePcm16(result.data);
    expect(Array.from(samples)).toEqual([-1,-1,0,32767/32768,32767/32768]);
    expect(result.level).toBeGreaterThan(0);
  });
  it('resamples 48 kHz to 16 kHz across worklet chunk boundaries',()=>{
    const encoder=new Pcm16Encoder(48000);
    const parts=Array.from({length:30},()=>encoder.encode(new Float32Array(128).fill(.5)));
    const samples=parts.flatMap(part=>Array.from(decodePcm16(part.data)));
    expect(samples).toHaveLength(1280);expect(samples.every(value=>Math.abs(value-.5)<.0001)).toBe(true);
  });
  it('resamples a 44.1 kHz device without accumulating chunk rounding errors',()=>{
    const encoder=new Pcm16Encoder(44100);
    let count=0;for(let i=0;i<441;i++)count+=decodePcm16(encoder.encode(new Float32Array(100)).data).length;
    expect(count).toBe(16000);
  });
  it('rejects malformed odd-byte PCM instead of playing corrupted audio',()=>{
    expect(()=>decodePcm16(btoa('x'))).toThrow();
  });
});
