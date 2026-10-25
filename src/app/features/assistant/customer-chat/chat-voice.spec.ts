import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ChatVoice } from './chat-voice';
import { AssistantApi } from '../assistant.api';

class Recorder {
  static isTypeSupported() { return true; }
  state = 'inactive';
  ondataavailable?: (event: {data:Blob}) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor(_: unknown, __: unknown) { recorder = this; }
  start() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.ondataavailable?.({data:new Blob(['voice'])}); this.onstop?.(); }
}
let recorder: Recorder;
describe('Chat voice lifecycle', () => {
  let voice: ChatVoice;
  let stop: ReturnType<typeof vi.fn>;
  let transcribe: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    stop = vi.fn(); transcribe = vi.fn().mockReturnValue(of({text:'សួស្តី'}));
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('MediaRecorder', Recorder);
    Object.defineProperty(navigator, 'mediaDevices', {configurable:true,value:{getUserMedia:vi.fn().mockResolvedValue({getTracks:()=>[{stop}]})}});
    TestBed.configureTestingModule({providers:[ChatVoice,{provide:AssistantApi,useValue:{transcribe}}]});
    voice = TestBed.inject(ChatVoice);
  });
  afterEach(() => { voice.reset(); vi.unstubAllGlobals(); });
  it('records only after action, releases microphone, and returns an editable Khmer draft', async () => {
    const review = vi.fn();
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    await voice.start('km',review);
    expect(voice.recording()).toBe(true);
    expect(transcribe).not.toHaveBeenCalled();
    voice.finish();
    expect(stop).toHaveBeenCalled();
    expect(review).toHaveBeenCalledWith('សួស្តី');
    expect(transcribe).toHaveBeenCalledWith(expect.any(Blob),'km');
    expect(voice.recording()).toBe(false);
    expect(voice.pending()).toBe(false);
  });
  it('surfaces safe provider errors without submitting the draft',async()=>{
    transcribe.mockReturnValue(throwError(()=>({status:503,error:{message:'Free voice transcription is temporarily unavailable.'}})));
    const review=vi.fn();await voice.start('km',review);voice.finish();
    expect(voice.error()).toContain('temporarily unavailable');expect(review).not.toHaveBeenCalled();expect(voice.pending()).toBe(false);
  });
  it('reports free quota exhaustion without retrying the recording',async()=>{
    transcribe.mockReturnValue(throwError(()=>({status:429})));
    await voice.start('en',vi.fn());voice.finish();
    expect(voice.error()).toContain('Free transcription quota');expect(transcribe).toHaveBeenCalledOnce();
  });
  it('handles an empty transcript without submitting or changing the draft', async () => {
    transcribe.mockReturnValue(of({text:'   '}));
    const review=vi.fn(); await voice.start('en',review); voice.finish();
    expect(review).not.toHaveBeenCalled(); expect(voice.pending()).toBe(false);
    expect(voice.error()).toContain('No speech');
  });
  it('discards recording on close without uploading audio', async () => {
    await voice.start('en',vi.fn()); voice.reset();
    expect(stop).toHaveBeenCalled(); expect(transcribe).not.toHaveBeenCalled();
  });
  it('releases a late microphone permission grant after close', async () => {
    let grant!: (stream: unknown) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve=>{grant=resolve as typeof grant;}));
    const start = voice.start('en',vi.fn()); voice.reset();
    grant({getTracks:()=>[{stop}]}); await start;
    expect(stop).toHaveBeenCalled(); expect(voice.recording()).toBe(false);
  });
  it('handles denied permissions and keeps transcription idle', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException('denied','NotAllowedError'));
    await voice.start('en',vi.fn());
    expect(voice.error()).toContain('permission denied'); expect(voice.pending()).toBe(false);
  });
  it('does not upload recordings exceeding the size limit', async () => {
    await voice.start('en',vi.fn());
    recorder.ondataavailable?.({data:new Blob([new Uint8Array(5*1024*1024+1)])});
    expect(transcribe).not.toHaveBeenCalled(); expect(stop).toHaveBeenCalled(); expect(voice.error()).toContain('5 MB');
  });
  it('defaults to silent replies and supports explicit play, pause, resume and stop', () => {
    const synthesis = {cancel:vi.fn(),speak:vi.fn(),pause:vi.fn(),resume:vi.fn(),getVoices:()=>[{lang:'en-US'}]};
    vi.stubGlobal('speechSynthesis',synthesis);
    vi.stubGlobal('SpeechSynthesisUtterance',class { constructor(public text:string) {} });
    expect(voice.autoPlay()).toBe(false);
    voice.play('Hello'); expect(synthesis.speak).toHaveBeenCalled();
    voice.togglePause(); expect(synthesis.pause).toHaveBeenCalled(); expect(voice.paused()).toBe(true);
    voice.togglePause(); expect(synthesis.resume).toHaveBeenCalled();
    voice.stopSpeech(); expect(voice.speaking()).toBe('');
    voice.play('សួស្តី'); expect(voice.error()).toContain('Khmer');
  });
  it('shows an actionable provider timeout without automatically re-uploading audio',async()=>{
    transcribe.mockReturnValue(throwError(()=>({status:504,error:{message:'Voice transcription timed out. Please try a shorter recording.'}})));
    const review=vi.fn();await voice.start('en',review);voice.finish();
    expect(voice.error()).toContain('shorter recording');expect(voice.pending()).toBe(false);expect(review).not.toHaveBeenCalled();expect(transcribe).toHaveBeenCalledOnce();
  });
});
