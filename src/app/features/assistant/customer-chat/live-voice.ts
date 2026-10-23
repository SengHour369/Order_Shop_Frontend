import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout, Subject } from 'rxjs';
import type { LiveServerMessage, Session, LiveConnectConfig } from '@google/genai';
import { ApiClient } from '../../../core/api/api-client';
import { ChatResponse } from '../assistant.api';
import { Pcm16Encoder, decodePcm16 } from './live-audio';
import { VoiceToolResponse, VoiceSyncEvent, VoiceContext, decodeVoiceResult, stableArguments } from './voice-events';
import { conversationId as requestId } from '../../../shared/utils/conversation-id';
export type { VoiceToolResponse } from './voice-events';
export interface VoiceUsage { dailyLimit:number; usedToday:number; reservedToday:number; remainingToday:number; maxDurationSeconds:number; timezone:string; retryAfterSeconds?:number; }
interface VoiceSession { sessionId:string; conversationId:string; expiresAt:string; maxDurationSeconds:number; }
interface StartResponse {session:VoiceSession; token:string; model:string; config:LiveConnectConfig; usage:VoiceUsage;}

@Injectable()
export class LiveVoice {
  private api = inject(ApiClient);
  readonly opened = signal(false);
  readonly status = signal('ENDED');
  readonly error = signal('');
  readonly retryAfter = signal(0);
  private retryTimer?: ReturnType<typeof setInterval>;
  readonly muted = signal(false);
  readonly seconds = signal(0);
  readonly remaining = signal(300);
  readonly level = signal(0);
  readonly speaker = signal(false);
  readonly usage = signal<VoiceUsage|null>(null);
  readonly transcript = signal<{role:string;text:string}[]>([]);
  language = 'km';
  private generation = 0;
  private session?: Session;
  private backend?: VoiceSession;
  private stream?: MediaStream;
  private audio?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private capture?: AudioWorkletNode | ScriptProcessorNode;
  private timer?: ReturnType<typeof setInterval>;
  private playback = new Set<AudioBufferSourceNode>();
  private nextPlay = 0;
  private setupResolve?: () => void;
  private cancelled = new Set<string>();
  readonly selectedContext=signal<VoiceContext>({});
  readonly selecting=signal(false);
  private readonly eventStream=new Subject<VoiceSyncEvent>();
  readonly events$=this.eventStream.asObservable();
  private operations:Promise<void>=Promise.resolve();
  private turnRequests=new Map<string,Promise<VoiceToolResponse>>();
  private detailCards=new Set<string>();
  private selectionRevision=0;
  private modelBusy=false;
  private suppressAudio=false;
  private pendingNotice='';
  private turn=0;
  private displayed = new Set<string>();
  private calls = new Map<string, Promise<VoiceToolResponse>>();
  private onDisplay?: (response:ChatResponse) => void;
  private onConversation?: (id:string) => void;
  constructor() { inject(DestroyRef).onDestroy(() => {this.close();clearInterval(this.retryTimer);}); }
  open(){
    this.opened.set(true);
    void firstValueFrom(this.api.get<VoiceUsage>('/api/ai/voice/usage').pipe(timeout(10000)))
      .then(usage=>this.applyUsage(usage)).catch(()=>{});
  }
  private retryIn(seconds:number){
    clearInterval(this.retryTimer);
    const deadline=Date.now()+Math.max(0,seconds)*1000;this.retryAfter.set(Math.max(0,seconds));
    if(seconds>0)this.retryTimer=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));this.retryAfter.set(left);if(!left)clearInterval(this.retryTimer);},250);
  }
  private applyUsage(usage:VoiceUsage){this.usage.set(usage);this.retryIn(usage.retryAfterSeconds||0);}
  statusLabel(){
    const labels:Record<string,[string,string]>={ENDED:['Ready to call','រួចរាល់សម្រាប់ការហៅ'],CONNECTING:['Connecting…','កំពុងភ្ជាប់…'],CONNECTED:['Connected','បានភ្ជាប់'],LISTENING:['Listening','កំពុងស្តាប់'],AI_SPEAKING:['AI speaking','AI កំពុងនិយាយ'],FAILED:['Call unavailable','មិនអាចហៅបាន']};
    const label=labels[this.status()]||[this.status(),this.status()];return this.text(...label);
  }
  isActive(){return this.status()!=='ENDED' && this.status()!=='FAILED';}
  text(en:string,km:string) { return this.language === 'km' ? km : en; }
  async start(conversation:string|null, display:(response:ChatResponse)=>void, established:(id:string)=>void, mode:'CUSTOMER'|'ADMIN'='CUSTOMER') {
    if(this.retryAfter()>0)return;
    if (this.status() !== 'ENDED' && this.status() !== 'FAILED') return;
    this.opened.set(true); this.error.set(''); this.status.set('CONNECTING'); this.transcript.set([]);
    this.onDisplay = display; this.onConversation = established;
    const generation = ++this.generation;
    try {
      // Create/resume audio synchronously from the Call button gesture for Safari/iOS.
      if (typeof AudioContext !== 'undefined') { this.audio = new AudioContext(); void this.audio.resume().catch(()=>{}); }
      const config = await firstValueFrom(this.api.get<{enabled:boolean}>('/api/ai/voice/config').pipe(timeout(10000)));
      if (generation !== this.generation) return;
      if (!config.enabled) throw new Error('Free AI voice calling is temporarily unavailable.');
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error(this.text('Voice calls require HTTPS and microphone support.','ការហៅ AI ត្រូវការ HTTPS និងមីក្រូហ្វូន។'));
      // Resume playback during the user gesture, before permission/network awaits (mobile browsers).
      if (!this.audio) throw new Error('Audio playback is unsupported in this browser.');
      await this.audio.resume();
      const stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if (generation !== this.generation) {stream.getTracks().forEach(t=>t.stop());return;}
      this.stream = stream;
      stream.getAudioTracks().forEach(track => track.onended = () => this.fail(this.text('Microphone disconnected.','មីក្រូហ្វូនបានផ្តាច់។')));
      const result = await firstValueFrom(this.api.post<StartResponse>('/api/ai/voice/sessions',{conversationId:conversation,language:this.language,mode}).pipe(timeout(20000)));
      if (generation !== this.generation) {void firstValueFrom(this.api.post(`/api/ai/voice/sessions/${result.session.sessionId}/end`,{})).catch(()=>{});return;}
      this.backend = result.session; this.applyUsage(result.usage); this.onConversation?.(result.session.conversationId);
      const setup = new Promise<void>(resolve => this.setupResolve = resolve);
      const { GoogleGenAI } = await import('@google/genai');
      if(generation!==this.generation)return;
      const ai = new GoogleGenAI({apiKey:result.token,httpOptions:{apiVersion:'v1alpha'}});
      const session = await ai.live.connect({model:result.model,config:result.config,callbacks:{
        onmessage: message => {if(generation===this.generation)void this.receive(message,generation).catch(()=>{if(generation===this.generation)this.fail(this.text('AI connection failed. Please retry.','មិនអាចភ្ជាប់ទៅ AI បានទេ។ សូមព្យាយាមម្ដងទៀត។'));});},
        onerror: () => {if(generation===this.generation)this.fail(this.text('Could not connect to AI. Please try again.','មិនអាចភ្ជាប់ទៅ AI បានទេ។ សូមព្យាយាមម្ដងទៀត។'));},
        onclose: () => {if(generation===this.generation)this.fail(this.text('AI connection ended. Free quota or session time may be exhausted.','ការតភ្ជាប់ AI បានបញ្ចប់។ សូមពិនិត្យកូតា និងព្យាយាមម្ដងទៀត។'));},
      }});
      if(generation!==this.generation){session.close();return;}this.session=session;
      let setupTimer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([setup,new Promise<never>((_,reject)=>setupTimer=setTimeout(()=>reject(new Error('AI connection timed out.')),15000))]); }
      finally {clearTimeout(setupTimer);}
      if(generation!==this.generation)return;
      this.applyUsage(await firstValueFrom(this.api.post<VoiceUsage>(`/api/ai/voice/sessions/${result.session.sessionId}/connected`,{}).pipe(timeout(10000))));
      if(generation!==this.generation)return;
      this.status.set('CONNECTED');this.seconds.set(0);this.muted.set(false);
      await this.captureAudio(generation);
      if(generation!==this.generation)return;
      this.status.set('LISTENING');this.opened.set(false);
      this.eventStream.next({type:'VOICE_CONNECTED',conversationId:result.session.conversationId});
      const deadline = Date.parse(result.session.expiresAt);
      this.timer=setInterval(()=>{
        const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));this.remaining.set(remaining);
        this.seconds.set(Math.max(0,result.session.maxDurationSeconds-remaining));
        if(!remaining)this.fail(this.text('Your AI call reached its time limit.','ការហៅ AI របស់អ្នកបានដល់រយៈពេលកំណត់ហើយ។'));
      },250);
      this.session.sendClientContent({turns:[{role:'user',parts:[{text:this.language==='en'?'Please greet me briefly in English.':'សួស្តី AI'}]}],turnComplete:true});
    } catch(error) {
      if(generation!==this.generation)return;
      const status=(error as {status?:number})?.status;
      if(status===409){
        const seconds=Number((error as {error?:{retryAfterSeconds?:number}}).error?.retryAfterSeconds)||0;
        this.retryIn(seconds);
      }
      this.fail(error instanceof DOMException && error.name==='NotAllowedError'
        ? this.text('Allow microphone access to talk with AI.','សូមអនុញ្ញាតឱ្យប្រើមីក្រូហ្វូន ដើម្បីនិយាយជាមួយ AI។')
        : status===429 ? this.text('Your daily free AI call limit has been reached.','អ្នកបានប្រើប្រាស់ការហៅ AI ឥតគិតថ្លៃអស់សម្រាប់ថ្ងៃនេះហើយ។')
        : status===409 ? this.text('An AI call is already active. Wait for its lease to expire before retrying.','មានការហៅ AI កំពុងដំណើរការ។ សូមរង់ចាំមុនព្យាយាមម្ដងទៀត។')
        : status===401 ? 'Your sign-in expired. Please sign in again.'
        : error instanceof Error && !status ? error.message : 'Free AI voice calling is temporarily unavailable.');
    }
  }
  private async captureAudio(generation:number) {
    const audio=this.audio!,stream=this.stream!;
    const encoder=new Pcm16Encoder(audio.sampleRate);
    const send=(samples:Float32Array)=>{
      if(generation!==this.generation||this.muted()||!this.session)return;
      const chunk=encoder.encode(samples);this.level.set(chunk.level);
      try{if(chunk.data)this.session.sendRealtimeInput({audio:{data:chunk.data,mimeType:'audio/pcm;rate=16000'}});}
      catch{this.fail(this.text('Audio input failed. Please retry.','មិនអាចបញ្ជូនសំឡេងបានទេ។'));}
    };
    this.source=audio.createMediaStreamSource(stream);
    const silence=audio.createGain();silence.gain.value=0;silence.connect(audio.destination);
    if(audio.audioWorklet){
      await audio.audioWorklet.addModule('/audio/eshop-capture.js');
      if(generation!==this.generation)return;
      const capture=new AudioWorkletNode(audio,'eshop-capture');capture.port.onmessage=event=>send(event.data);this.capture=capture;
    }else{
      const capture=audio.createScriptProcessor(2048,1,1);capture.onaudioprocess=event=>send(event.inputBuffer.getChannelData(0));this.capture=capture;
    }
    this.source.connect(this.capture);this.capture.connect(silence);
  }
  private async receive(message:LiveServerMessage,generation:number) {
    if(message.setupComplete)this.setupResolve?.();
    for(const id of message.toolCallCancellation?.ids||[])this.cancelled.add(id);
    const content=message.serverContent;
    if(content?.modelTurn||content?.outputTranscription)this.modelBusy=true;
    if(content?.inputTranscription?.text)this.turnRequests.clear();
    if(content?.interrupted){this.flush();this.status.set('LISTENING');}
    const append=(role:string,text?:string)=>{if(!text)return;this.transcript.update(rows=>{
      const next=rows.map(row=>({...row}));const last=next.at(-1);
      if(last?.role===role)last.text+=text;else next.push({role,text});return next.slice(-40);
    });};
    append('You',content?.inputTranscription?.text);if(!this.suppressAudio)append('AI',content?.outputTranscription?.text);
    if(this.backend){
      if(content?.inputTranscription?.text)this.eventStream.next({type:'VOICE_TRANSCRIPT_UPDATED',conversationId:this.backend.conversationId,turnId:`${this.backend.sessionId}:${this.turn}:user`,text:content.inputTranscription.text});
      if(content?.outputTranscription?.text&&!this.suppressAudio)this.eventStream.next({type:'AI_VOICE_RESPONSE',conversationId:this.backend.conversationId,turnId:`${this.backend.sessionId}:${this.turn}:assistant`,text:content.outputTranscription.text});
    }
    for(const part of content?.modelTurn?.parts||[]){
      if(!this.suppressAudio && !content?.interrupted && part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')){
        try{this.play(part.inlineData.data,Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1]||24000));}
        catch{this.fail(this.text('Audio playback failed. Please retry.','មិនអាចចាក់សំឡេងបានទេ។'));return;}
      }
    }
    for(const call of message.toolCall?.functionCalls||[]){
      if(!call.id||!call.name||!this.backend)continue;
      const id=call.id,name=call.name,backend=this.backend;
      if(name==='search_products')this.eventStream.next({type:'PRODUCT_SEARCH_STARTED',conversationId:backend.conversationId,callId:id});
      void this.enqueue(async()=>{
        if(generation!==this.generation||this.cancelled.has(id))return;
        try{
          let pending=this.calls.get(id);
          const fingerprint=name+':'+stableArguments(call.args||{});
          if(!pending){
            pending=this.turnRequests.get(fingerprint);
            if(!pending){pending=firstValueFrom(this.api.post<unknown>(`/api/ai/voice/sessions/${backend.sessionId}/tools`,{callId:id,name,arguments:call.args||{}}).pipe(timeout(20000))).then(value=>decodeVoiceResult(value,backend.conversationId));this.turnRequests.set(fingerprint,pending);}
            this.calls.set(id,pending);
          }
          const response=await pending;
          if(generation!==this.generation||this.cancelled.has(id))return;
          this.accept(response);
          this.session?.sendToolResponse({functionResponses:[{id,name,response:response.modelResult}]});
        }catch{
          if(generation===this.generation&&!this.cancelled.has(id)){this.error.set(this.text('Could not display the requested information. Check your permissions or try again.','មិនអាចបង្ហាញព័ត៌មានដែលបានស្នើទេ។ សូមពិនិត្យសិទ្ធិ ឬព្យាយាមម្តងទៀត។'));this.opened.set(false);}
          if(generation===this.generation&&!this.cancelled.has(id))try{this.session?.sendToolResponse({functionResponses:[{id,name,response:{status:'FAILURE',message:'Tool execution failed. Check the shop UI before retrying changes.'}}]});}catch{}
        }
      });
    }
    if(content?.turnComplete||content?.interrupted){this.modelBusy=false;this.turn++;this.turnRequests.clear();this.sendNotice();}
  }
  private enqueue(operation:()=>Promise<void>):Promise<void>{
    const next=this.operations.then(operation);this.operations=next.catch(()=>{});return next;
  }
  private accept(response:VoiceToolResponse){
    if(this.displayed.has(response.event.eventId))return;
    this.displayed.add(response.event.eventId);
    if(response.modelResult.context)this.selectedContext.set(response.modelResult.context);
    const data=response.display?.result.data,context=response.modelResult.context;
    if(data&&typeof data==='object'&&!Array.isArray(data)&&context?.selectedSkuId&&(data as Record<string,unknown>)['id']===context.selectedProductId)
      (data as Record<string,unknown>)['selectedSkuId']=context.selectedSkuId;
    let show=true;
    if(response.display&&['PRODUCT_SELECTED','PRODUCT_DETAIL_LOADED'].includes(response.event.type)){
      const fingerprint=stableArguments(response.display.result.data);
      show=!this.detailCards.has(fingerprint);this.detailCards.add(fingerprint);
    }
    if(response.display&&show){this.onDisplay?.(response.display);this.opened.set(false);}
    this.eventStream.next({type:response.event.type,conversationId:response.event.conversationId,result:response});
  }
  isConnected(){return !!this.session&&!!this.backend&&this.isActive();}
  async selectProduct(productId:number,skuId?:number){
    if(!Number.isSafeInteger(productId)||productId<1||skuId!==undefined&&(!Number.isSafeInteger(skuId)||skuId<1)||!this.backend||!this.session)return;
    const backend=this.backend,generation=this.generation,revision=++this.selectionRevision;
    this.selecting.set(true);this.suppressAudio=true;this.flush();this.opened.set(false);
    await this.enqueue(async()=>{
      if(generation!==this.generation)return;
      try{
        const raw=await firstValueFrom(this.api.post<unknown>(`/api/ai/voice/sessions/${backend.sessionId}/selection`,{requestId:requestId(),productId,skuId}).pipe(timeout(20000)));
        const result=decodeVoiceResult(raw,backend.conversationId);
        if(generation!==this.generation||revision!==this.selectionRevision)return;
        this.accept(result);
        if(result.modelResult.status!=='SUCCESS')throw new Error('Product lookup failed');
        this.pendingNotice=`The customer selected product ID ${productId}${skuId?`, SKU ID ${skuId}`:''} in the verified shop UI. Retrieve get_product_details for this product${skuId?' and check_product_stock for this SKU':''} before explaining it. Explain only actual features, prices, promotions, attributes and stock in the selected language; continue the same conversation. Never confirm a write from this message.`;
        this.sendNotice();
      }catch{if(generation===this.generation&&revision===this.selectionRevision){this.error.set(this.text('Could not select this product. Please try again.','មិនអាចជ្រើសផលិតផលនេះបានទេ។'));this.suppressAudio=false;}}
      finally{if(revision===this.selectionRevision)this.selecting.set(false);}
    });
  }
  displayedProducts(productIds:number[]){
    const backend=this.backend;if(!backend||!this.session)return;
    void this.enqueue(async()=>{if(this.backend!==backend)return;try{
      await firstValueFrom(this.api.post(`/api/ai/voice/sessions/${backend.sessionId}/displayed-products`,{productIds}).pipe(timeout(10000)));
      this.pendingNotice=`The visible product card order is now these verified IDs: ${productIds.join(', ')}. Resolve ordinal references using this order. Do not switch the selected product unless the customer requests it.`;this.sendNotice();
    }catch{this.error.set('Could not synchronize product order. Select a product explicitly.');}});
  }
  private sendNotice(){
    if(!this.pendingNotice||this.modelBusy||!this.session)return;
    const text=this.pendingNotice;this.pendingNotice='';this.suppressAudio=false;this.turn++;
    try{this.session.sendRealtimeInput({text});}catch{this.fail('Could not synchronize the product with the voice call.');}
  }
  refreshAfterConfirmation(){
    try { this.session?.sendClientContent({turns:[{role:'user',parts:[{text:'I used the confirmation controls in the shop UI. Retrieve current cart/order/payment state using tools before reporting any outcome.'}]}],turnComplete:true}); } catch { this.fail('AI connection ended. Check the confirmed result in chat.'); }
  }
  private play(data:string,rate:number){
    const audio=this.audio;if(!audio)return;
    const samples=decodePcm16(data),buffer=audio.createBuffer(1,samples.length,rate);buffer.copyToChannel(samples,0);
    if(this.nextPlay-audio.currentTime>20)throw new Error('Audio queue overflow');
    const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);
    this.nextPlay=Math.max(audio.currentTime,this.nextPlay);this.playback.add(source);this.speaker.set(true);this.status.set('AI_SPEAKING');
    source.onended=()=>{this.playback.delete(source);source.disconnect();if(!this.playback.size){this.speaker.set(false);if(this.session)this.status.set('LISTENING');}};
    source.start(this.nextPlay);this.nextPlay+=buffer.duration;
  }
  toggleMute(){this.muted.update(value=>!value);this.stream?.getAudioTracks().forEach(t=>t.enabled=!this.muted());this.level.set(0);if(this.muted())this.session?.sendRealtimeInput({audioStreamEnd:true});}
  private flush(){for(const source of this.playback){source.onended=null;try{source.stop();source.disconnect();}catch{}}this.playback.clear();this.nextPlay=0;this.speaker.set(false);}
  private fail(message:string){this.end();this.status.set('FAILED');this.error.set(message);}
  end(){
    ++this.generation;this.operations=Promise.resolve();clearInterval(this.timer);this.setupResolve?.();this.setupResolve=undefined;
    try{this.session?.close();}catch{}this.session=undefined;this.flush();
    this.capture?.disconnect();if(typeof AudioWorkletNode !== 'undefined' && this.capture instanceof AudioWorkletNode)this.capture.port.onmessage=null;
    if(typeof ScriptProcessorNode !== 'undefined' && this.capture instanceof ScriptProcessorNode)this.capture.onaudioprocess=null;
    this.capture=undefined;this.source?.disconnect();this.source=undefined;
    this.stream?.getTracks().forEach(track=>{track.onended=null;track.stop();});this.stream=undefined;
    void this.audio?.close().catch(()=>{});this.audio=undefined;this.level.set(0);this.calls.clear();this.cancelled.clear();this.displayed.clear();this.detailCards.clear();this.turnRequests.clear();this.pendingNotice='';this.modelBusy=false;this.suppressAudio=false;this.selecting.set(false);this.selectedContext.set({});++this.selectionRevision;
    const backend=this.backend;this.backend=undefined;
    if(backend){this.retryIn(Math.max(0,Math.ceil((Date.parse(backend.expiresAt)-Date.now())/1000)));void firstValueFrom(this.api.post(`/api/ai/voice/sessions/${backend.sessionId}/end`,{}).pipe(timeout(10000))).catch(()=>{});}
    if(backend)this.eventStream.next({type:'VOICE_ENDED',conversationId:backend.conversationId});
    this.status.set('ENDED');
  }
  close(){this.end();this.opened.set(false);}
}
