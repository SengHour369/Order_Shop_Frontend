import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LiveVoice } from './live-voice';

describe('Live voice session safety',()=>{
 let http:HttpTestingController;let call:LiveVoice;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[LiveVoice,provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);call=TestBed.inject(LiveVoice);});
 afterEach(()=>{call.close();http.verify();vi.unstubAllGlobals();});
 it('shows a lease countdown and prevents repeated session attempts until expiry',async()=>{
   vi.useFakeTimers();
   try{
     call.open();http.expectOne('/api/ai/voice/usage').flush({dailyLimit:5,remainingToday:4,retryAfterSeconds:20});await Promise.resolve();
     expect(call.retryAfter()).toBe(20);
     await call.start(null,()=>{},()=>{});http.expectNone('/api/ai/voice/config');
     vi.advanceTimersByTime(20000);expect(call.retryAfter()).toBe(0);
   }finally{vi.useRealTimers();}
 });
 it('does not request microphone access when free calling is disabled',async()=>{
   const media=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:media}});
   const start=call.start(null,()=>{},()=>{});
   http.expectOne('/api/ai/voice/config').flush({enabled:false});await start;
   expect(media).not.toHaveBeenCalled();expect(call.status()).toBe('FAILED');
   expect(call.error()).toBe('Free AI voice calling is temporarily unavailable.');
 });
 it('does not start recording after the customer closes during preflight',async()=>{
   const media=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:media}});
   const start=call.start(null,()=>{},()=>{});const request=http.expectOne('/api/ai/voice/config');
   call.close();request.flush({enabled:true});await start;
   expect(media).not.toHaveBeenCalled();expect(call.opened()).toBe(false);
 });
 it('prevents multiple concurrent starts',async()=>{
   const one=call.start(null,()=>{},()=>{});await call.start(null,()=>{},()=>{});
   const request=http.expectOne('/api/ai/voice/config');request.flush({enabled:false});await one;
 });
 it('reports Khmer permission errors and releases audio resources',async()=>{
   vi.stubGlobal('isSecureContext',true);
   vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn().mockRejectedValue(new DOMException('denied','NotAllowedError'))}});
   const close=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('AudioContext',class{resume=vi.fn().mockResolvedValue(undefined);close=close;});
   const start=call.start(null,()=>{},()=>{});http.expectOne('/api/ai/voice/config').flush({enabled:true});await start;
   expect(call.error()).toContain('សូមអនុញ្ញាត');expect(close).toHaveBeenCalledOnce();expect(call.status()).toBe('FAILED');
 });
 it('mutes tracks without leaving capture running after end',()=>{
   const track={enabled:true,onended:null,stop:vi.fn()};
   (call as unknown as {stream:unknown}).stream={getAudioTracks:()=>[track],getTracks:()=>[track]};
   call.toggleMute();expect(track.enabled).toBe(false);expect(call.muted()).toBe(true);
   call.toggleMute();expect(track.enabled).toBe(true);call.end();expect(track.stop).toHaveBeenCalledOnce();
 });
 it('keeps actual Khmer transcript fragments and flushes playback on interruption',async()=>{
   const receive=(call as unknown as {receive:(message:unknown,generation:number)=>Promise<void>}).receive.bind(call);
   await receive({serverContent:{inputTranscription:{text:'សួស្តី '}}},0);
   await receive({serverContent:{inputTranscription:{text:'AI'}}},0);
   await receive({serverContent:{outputTranscription:{text:'សួស្តី!'}}},0);
   expect(call.transcript()).toEqual([{role:'You',text:'សួស្តី AI'},{role:'AI',text:'សួស្តី!'}]);
   call.speaker.set(true);await receive({serverContent:{interrupted:true}},0);
   expect(call.speaker()).toBe(false);expect(call.status()).toBe('LISTENING');
 });
 it('saves finalized call text in order, combines fragments, and does not save twice',async()=>{
   const internal=call as unknown as {backend:unknown;receive:(message:unknown,generation:number)=>Promise<void>;memoryWrites:Promise<void>};
   internal.backend={sessionId:'session',conversationId:'conversation',expiresAt:new Date(Date.now()+300000).toISOString(),maxDurationSeconds:300};
   await internal.receive({serverContent:{inputTranscription:{text:'SOVIA-'}}},0);
   await internal.receive({serverContent:{inputTranscription:{text:'F'},outputTranscription:{text:'Which variant?'}}},0);
   http.expectNone('/api/ai/voice/sessions/session/transcript');
   await internal.receive({serverContent:{turnComplete:true}},0);
   await Promise.resolve();
   const user=http.expectOne('/api/ai/voice/sessions/session/transcript');
   expect(user.request.body).toEqual({turn:0,role:'user',text:'SOVIA-F'});user.flush({saved:true});
   await vi.waitFor(()=>{
     const assistant=http.expectOne('/api/ai/voice/sessions/session/transcript');
     expect(assistant.request.body).toEqual({turn:0,role:'assistant',text:'Which variant?'});assistant.flush({saved:true});
   });
   await internal.memoryWrites;
   internal.backend=undefined;
   call.end();http.expectNone('/api/ai/voice/sessions/session/transcript');
 });
});
