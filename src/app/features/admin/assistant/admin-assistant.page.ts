import { ChatVoice } from '../../assistant/customer-chat/chat-voice';
import { LiveVoice } from '../../assistant/customer-chat/live-voice';
import { VoiceCall } from '../../assistant/customer-chat/voice-call';
import { adminOrderPresentation } from '../../assistant/admin-order-presentation';
import { ChatPresentation } from '../../assistant/chat-presentation';
import { PromotionsPage } from '../promotions/promotions.page';
import { parseProductInput, productNotes } from '../products/product-form-assistance';
import { ProductFormPage } from '../products/products.page';
import { ChatUiRenderer } from '../../assistant/chat-ui-renderer';
import { AssistantResult } from '../../assistant/assistant-result';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { RichMessage } from '../../assistant/rich-message';
import { AssistantLauncherState } from '../../assistant/floating/launcher-state';
import { Router } from '@angular/router';
import { conversationId } from "../../../shared/utils/conversation-id";
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap, takeWhile } from 'rxjs';
import { AssistantPage } from '../../assistant/assistant.page';
import { AssistantApi, AiResult } from '../../assistant/assistant.api';
import { AssistantProductCard } from '../../assistant/assistant-product';
import { AdminApi, Row } from '../api/admin.api';
import { Icon } from '../../../shared/components/icon';
import { AiImportComponent } from '../imports/ai-import.component';
import { PermissionService } from '../../../core/auth/permission.service';

interface ProductDraft {
  name: string; description: string; category: number | null; categoryName?:string; skuDescription?:string;
  price: number | null; quantity: number; warehouse: string; color: string; storage: string;
}
interface Operation { title: string; status: string; time: Date; data?: unknown; }
type Turn = NonNullable<ReturnType<AssistantPage['current']>>['messages'][number];

@Component({
  providers: [ChatVoice, LiveVoice],
  imports: [VoiceCall, PromotionsPage, ProductFormPage, ChatUiRenderer, AssistantResult, CanAccessDirective, RichMessage, TranslatePipe, FormsModule, DatePipe, RouterLink, Icon, AssistantProductCard, AiImportComponent],
  templateUrl: './admin-assistant.html',
  styleUrl: './admin-assistant.css',
})
export class AdminAssistantPage extends AssistantPage {
  override administrator=true;
  readonly voice=inject(ChatVoice);
  readonly live=inject(LiveVoice);
  voiceLanguage='km';
  openCall(){if(this.locked()||this.voice.pending())return;this.voice.reset();this.live.open();}
  startCall(){
    this.voice.reset();
    void this.live.start(this.current()?.id||null,response=>{
      const active=this.current();if(!active)return;
      if(active.id!==response.conversationId)return;
      active.messages.push({role:'assistant',text:response.result.message,time:new Date(),result:{...response.result,presentation:response.presentation},suggestions:response.suggestions});
      this.current.set({...active});this.view.set('chat');this.scrollChat();
    },id=>{
      let active=this.current();
      if(!active){active={localId:conversationId(),id,title:'Voice conversation',time:new Date(),messages:[]};this.conversations.update(rows=>[active!,...rows]);}
      active.id=id;this.current.set({...active});
    },'ADMIN');
  }
  recordVoice(){
    if(this.locked()||this.live.isActive()||this.voice.pending())return;
    if(this.voice.recording()){this.voice.finish();return;}
    void this.voice.start(this.voiceLanguage,text=>{this.prompt=(this.prompt?this.prompt+' ':'')+text;this.language=this.voiceLanguage;});
  }

  private launcher=inject(AssistantLauncherState);
  private assistantNavigation=inject(Router);
  panelControlsVisible=signal(true);
  historyOpen=signal(false);
  historyWidth=signal(250);
  historyResizing=signal(false);
  private historyDrag: {pointerId:number;startX:number;width:number} | null = null;
  private historyLimit(handle:HTMLElement) {
    const available=handle.parentElement?.getBoundingClientRect().width || 1000;
    return Math.max(180,Math.min(480,available <= 800 ? available * .86 : available - 360));
  }
  startHistoryResize(event:PointerEvent) {
    if(event.button !== 0) return;
    const handle=event.currentTarget as HTMLElement;
    event.preventDefault();handle.setPointerCapture(event.pointerId);
    this.historyDrag={pointerId:event.pointerId,startX:event.clientX,width:this.historyWidth()};
    this.historyResizing.set(true);
  }
  moveHistoryResize(event:PointerEvent) {
    const drag=this.historyDrag;if(!drag || event.pointerId !== drag.pointerId)return;
    this.historyWidth.set(Math.round(Math.max(180,Math.min(this.historyLimit(event.currentTarget as HTMLElement),drag.width+event.clientX-drag.startX))));
  }
  stopHistoryResize(event:PointerEvent) {
    if(this.historyDrag?.pointerId !== event.pointerId)return;
    this.historyDrag=null;this.historyResizing.set(false);
    const handle=event.currentTarget as HTMLElement;
    if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
  }
  resizeHistoryKey(event:KeyboardEvent) {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const maximum=this.historyLimit(event.currentTarget as HTMLElement);
    const width=event.key==='Home'?180:event.key==='End'?maximum:this.historyWidth()+(event.key==='ArrowRight'?20:-20);
    this.historyWidth.set(Math.round(Math.max(180,Math.min(maximum,width))));
  }
  responseNotice=signal('');
  orderPresentation = adminOrderPresentation;
  openedOrder = signal<ChatPresentation|null>(null);
  showOrderInChat(id:number){if(Number.isSafeInteger(id)&&id>0)this.openedOrder.set({schemaVersion:'1.0',blocks:[{kind:'orders.detail',entityId:id}]});}
  async copyResponse(text:string){try{await navigator.clipboard.writeText(text);this.responseNotice.set('Response copied');}catch{this.responseNotice.set('Copy unavailable. Select the response to copy it.');}}
  vote(turn:Turn,rating:'up'|'down'){
    if(!turn.requestKey)return;
    this.assistantApi.feedback(turn.requestKey,rating).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{turn.feedback=rating;this.current.update(c=>c?{...c}:null);this.responseNotice.set('Feedback saved');},error:()=>this.responseNotice.set('Feedback could not be saved. Please try again.')});
  }
  resultPending(result?:AiResult){return result?.status==='NEEDS_CONFIRMATION'||result?.status==='RUNNING'||!!(result?.data&&typeof result.data==='object'&&'confirmationId' in result.data);}
  regenerate(index:number){if(this.locked()||this.quota.exhausted())return;const turns=this.current()?.messages||[];const last=[...turns.slice(0,index)].reverse().find(t=>t.role==='user');if(last){this.prompt=last.text;this.send();}}
  closeAssistant(){this.voice.reset();this.live.close();if(!this.locked()&&!this.draft()&&!this.stockOpen()&&!this.promotionOpen())void this.assistantNavigation.navigateByUrl(this.launcher.returnUrl.startsWith('/admin/assistant')?'/admin':this.launcher.returnUrl);}
  importAccess=inject(PermissionService);
  importBatchId=signal('');
  attachAdminFile(event:Event) { this.attachText(event); }
  private assistantApi = inject(AssistantApi);
  private management = inject(AdminApi);
  private destroy = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  view = signal('chat');
  historyTab = signal('recent');
  pinned = signal<string[]>([]);
  operations = signal<Operation[]>([]);
  cancelled = new WeakSet<Turn>();
  submitted = new WeakSet<Turn>();
  confirming = signal(false);
  pollError = signal('');
  draft = signal<ProductDraft | null>(null);
  productFormBusy = signal(false);
  promotionOpen = signal(false);
  promotionBusy = signal(false);
  private productForm = viewChild(ProductFormPage);
  saving = signal(false);
  uncertain = signal(false);
  processing = signal('');
  inventoryId: number | null = null;
  stockQuantity: number | null = null;
  stockOpen = signal(false);
  stockReview = signal(false);
  sections = [['chat','Chat Bot'],['control','Control Center'],['conversations','Conversations'],['executions','Tool Execution'],['tools','Tools'],['permissions','Permissions'],['settings','Settings']];
  actionIcon(action:string){return ({'Create product':'bag','Create promotion':'tag','Stock in':'box','Review order':'cart','Show low stock':'chart','Generate report':'file'} as Record<string,string>)[action]||'help';}
  quickPrompts = ['Create product', 'Create promotion', 'Stock in', 'Review order', 'Show low stock', 'Generate report'];

  selectVoiceProduct(selection:{productId:number;skuId?:number}){void this.live.selectProduct(selection.productId,selection.skuId);}
  override ngOnInit() {
    this.live.events$.pipe(takeUntilDestroyed(this.destroy)).subscribe(event=>{
      const active=this.current();if(!active||event.conversationId!==active.id||!('turnId' in event))return;
      let turn=active.messages.find(row=>row.voiceTurnId===event.turnId);
      if(!turn){turn={role:event.type==='VOICE_TRANSCRIPT_UPDATED'?'user':'assistant',text:'',time:new Date(),voiceTurnId:event.turnId};active.messages.push(turn);}
      turn.text+=event.text;this.current.set({...active});
    });
    super.ngOnInit();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => {
      const view = params.get('view') || 'chat';
      this.view.set(this.sections.some(section => section[0] === view) ? view : 'chat');
    });
  }
  visibleConversations() {
    return this.conversationGroups().flatMap(group => group.items)
      .filter(item => this.historyTab() !== 'pinned' || this.pinned().includes(item.id));
  }
  pin(id: string) {
    this.pinned.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }
  shortcut(value: string) {
    if (this.locked()) return;
    if (value === 'Create promotion') { this.startPromotion(); return; }
    if (value === 'Create product') { this.startProduct(); return; }
    if (value === 'Stock in') { this.stockOpen.set(true); this.stockReview.set(false); this.uncertain.set(false); return; }
    this.choose(({ 'Create promotion': 'Create a draft promotion', 'Review order': 'Show orders for today', 'Generate report': 'Show order counts by status' } as Record<string,string>)[value] || value);
  }
  locked() { return this.busy() || this.saving() || this.confirming() || this.productFormBusy() || this.promotionBusy(); }
  override newConversation() {
    if (this.locked()) return;
    this.voice.reset();this.live.close();
    this.openedOrder.set(null); this.resetProduct(); this.promotionOpen.set(false); this.stockOpen.set(false); super.newConversation();
  }
  override open(conversation: NonNullable<ReturnType<AssistantPage['current']>>) {
    if (this.locked()) return;
    this.voice.reset();this.live.close();
    this.openedOrder.set(null); this.resetProduct(); this.promotionOpen.set(false); this.stockOpen.set(false); super.open(conversation);
  }
  override send() {
    if (this.locked() || this.stockOpen() || this.promotionOpen() || this.voice.recording() || this.voice.pending()) return;
    if(/^\s*(?:please\s+)?(?:create|add)(?: a| new| a new)? (?:draft )?promotion\b/i.test(this.prompt)){const text=this.prompt;this.startPromotion(text);this.prompt='';return;}
    if(this.draft()) { this.helpProductInput(); return; }
    const notes=productNotes(this.prompt);
    if(notes){
      const text=this.prompt;
      if(/(?:create|add)[\s\S]{0,60}product|បង្កើត[\s\S]{0,60}ផលិតផល/i.test(text)){this.startProduct(text);}
      else{
        let current=this.current();if(!current){current={localId:conversationId(),id:null,title:notes.name||'Product information',time:new Date(),messages:[]};this.conversations.update(rows=>[current!,...rows]);}
        current.messages.push({role:'user',text,time:new Date()},{role:'assistant',text:'ខ្ញុំបានស្គាល់ព័ត៌មានផលិតផល '+notes.name+'។ តើអ្នកចង់ប្រើព័ត៌មាននេះបង្កើតផលិតផលព្រាងឬទេ? តម្លៃ និងស្តុកដែលខ្វះត្រូវបំពេញមុនដាក់ស្នើ។',time:new Date(),productSource:text});this.current.set({...current});this.scrollChat();
      }
      this.prompt='';return;
    }
    if(this.openKnownOrders())return;
    if (/^\s*(?:stock in|add stock)\b/i.test(this.prompt)) {
      this.stockQuantity = Number(this.prompt.match(/(?:stock in|add stock)\s+(\d+)/i)?.[1]) || null;
      this.inventoryId = Number(this.prompt.match(/inventory(?: record)?\s*#?\s*(\d+)/i)?.[1]) || null;
      this.stockOpen.set(true); this.stockReview.set(false); this.prompt = ''; return;
    }
    if (/^\s*(?:please\s+)?(?:help\s+(?:me\s+)?(?:to\s+)?)?(?:(?:create|add)(?: a| new| a new)? product\b|បង្កើតផលិតផល)/i.test(this.prompt)) {
      const prompt = this.prompt;
      this.startProduct(prompt); this.prompt = ''; return;
    }
    super.send();
  }
  onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); this.send(); }
  }
  pending(turn: Turn): string | null {
    if (this.cancelled.has(turn) || this.submitted.has(turn)) return null;
    const data = turn.result?.data as Row | null;
    return data && typeof data['confirmationId'] === 'string' ? data['confirmationId'] : null;
  }
  preview(data: unknown): Row | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const row = data as Row;
    return (row['preview'] || row['parameters'] || row) as Row;
  }
  entries(data: unknown) { return Object.entries(this.preview(data) || {}).filter(([key]) => !/token|secret|password/i.test(key)); }
  cancel(turn: Turn) { if (this.locked()) return; this.cancelled.add(turn); turn.text = 'Action cancelled. No change was submitted.'; this.current.update(value => value ? { ...value } : null); }
  edit(turn: Turn) {
    if (this.locked()) return;
    this.cancel(turn);
    this.choose('Revise the previous action: ');
  }
  confirm(turn: Turn) {
    const id = this.pending(turn);
    if (!id || this.locked()) return;
    this.confirming.set(true); this.submitted.add(turn); this.error.set('');
    const operation: Operation = { title: turn.result?.intent || 'Confirmed action', status: 'RUNNING', time: new Date() };
    this.operations.update(rows => [operation, ...rows]);
    this.assistantApi.confirm(id,this.current()?.id||null).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: result => {
        this.live.refreshAfterConfirmation();
        this.confirming.set(false); turn.result = result; turn.text = result.message;
        this.updateOperation(operation, result.status, result.data);
        if(result.status==='SUCCESS'&&result.intent==='ADMIN_IMPORT_DRAFT')this.openImportDraft(result);
        this.current.update(value => value ? { ...value } : null);
        if (result.status === 'RUNNING' && result.executionId) this.poll(turn, operation);
      },
      error: () => {
        this.confirming.set(false); this.updateOperation(operation, 'UNKNOWN');
        this.error.set('The confirmation response was lost. Check the affected record before retrying; the action may have completed.');
      },
    });
  }
  openImportDraft(result:AiResult){
    const data=result.data as Row|null;
    if(data&&typeof data['batchId']==='string'){this.importBatchId.set(data['batchId']);this.view.set('imports');}
  }
  private poll(turn: Turn, operation: Operation) {
    const id = turn.result!.executionId!;
    let finished = false;
    this.pollError.set('');
    timer(1500, 2500).pipe(switchMap(() => this.assistantApi.status(id)),
      takeWhile((value, index) => (value as AiResult).status === 'RUNNING' && index < 23, true),
      takeUntilDestroyed(this.destroy)).subscribe({
        next: value => {
          const result = value as Partial<AiResult>;
          if (!result.status) return;
          finished = result.status !== 'RUNNING';
          turn.result = { ...turn.result!, status: result.status, errorCode: result.errorCode };
          if (result.message) turn.text = result.message;
          this.updateOperation(operation, result.status, turn.result.data);
          this.current.update(current => current ? { ...current } : null);
        },
        error: () => this.pollError.set('Status updates are unavailable. Use Check status to retry; do not submit the action again.'),
        complete: () => { if (!finished) this.pollError.set('This action is still processing. Use Check status for the latest result.'); },
      });
  }
  override check(turn: Turn) {
    const id = turn.result?.executionId;
    if (!id || this.locked()) return;
    this.run(this.assistantApi.status(id), value => {
      const status = value as Partial<AiResult>;
      if (typeof status.status !== 'string') return;
      turn.result = { ...turn.result!, status: status.status, errorCode: status.errorCode };
      this.current.update(current => current ? { ...current } : null);
    });
  }
  private updateOperation(operation: Operation, status: string, data?: unknown) {
    operation.status = status; operation.data = data;
    this.operations.update(rows => [...rows]);
  }
  private openKnownOrders() {
    const text=this.prompt.trim();
    const list=text.match(/^(?:show|list|view)(?: me)?(?: all)? orders(?: (?:for )?(today))?[.!]?$/i);
    const detail=text.match(/^(?:show|view|open)(?: me)?(?: the)? order(?: details?(?: for)?)?\s+((?:ORD-[\w-]+|anOrder_\d+))[.!]?$/i);
    if(!list && !detail)return false;
    let current=this.current();if(!current){current={localId:conversationId(),id:null,title:text.slice(0,80),time:new Date(),messages:[]};this.conversations.update(rows=>[current!,...rows]);}
    current.messages.push({role:'user',text,time:new Date()});this.current.set({...current});this.prompt='';
    const conversation=current;
    const add=(result:AiResult)=>{conversation.messages.push({role:'assistant',text:result.message,time:new Date(),result});this.current.set({...conversation});};
    if(list && !list[1]) {add({executionId:null,status:'SUCCESS',intent:'ADMIN_ORDER_LIST',message:'Orders are shown below. Choose View order to open details here.',data:null,presentation:{schemaVersion:'1.0',blocks:[{kind:'orders.list'}]}});return true;}
    this.saving.set(true);
    if(detail){
      this.management.orderByNumber(detail[1].replace(/^anorder_/i,'anOrder_')).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:order=>{this.saving.set(false);add({executionId:null,status:'SUCCESS',intent:'ORDER_GET',message:'Order details are shown below.',data:order});},error:()=>{this.saving.set(false);add({executionId:null,status:'FAILURE',message:'Could not retrieve that order. Check the order number and your access, then retry.',data:null});}});
    }else{
      const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Phnom_Penh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      this.assistantApi.tool('ADMIN_ORDER_LIST',{date}).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:result=>{
        this.saving.set(false);
        if(result.status==='SUCCESS' && Array.isArray(result.data))add({...result,message:`Order results for ${date} are shown below. Choose View order to open details here.`,presentation:{schemaVersion:'1.0',blocks:[{kind:'orders.list',records:result.data,date}]}});
        else add(result);
      },error:()=>{this.saving.set(false);add({executionId:null,status:'FAILURE',message:'The order service could not retrieve today’s orders. Please retry.',data:null});}});
    }
    return true;
  }
  startPromotion(text='Create a draft promotion') {
    if(this.locked())return;
    if(this.draft()){this.responseNotice.set('Finish or cancel the open product form before creating a promotion.');return;}
    this.view.set('chat');this.stockOpen.set(false);this.promotionOpen.set(true);
    let current=this.current();if(!current){current={localId:conversationId(),id:null,title:text.slice(0,80),time:new Date(),messages:[]};this.conversations.update(rows=>[current!,...rows]);}
    current.messages.push({role:'user',text,time:new Date()},{role:'assistant',text:'Complete the promotion form below. Nothing is saved until you submit the form.',time:new Date()});this.current.set({...current});
  }
  promotionSaved(result:{id:number;status:string}) {
    this.promotionBusy.set(false);this.promotionOpen.set(false);
    this.appendResult('Promotion saved.',result,'PROMOTION_GET');
  }
  startProduct(prompt = 'Create product') {
    if (this.locked()) return;
    this.view.set('chat');
    this.promotionOpen.set(false);
    this.stockOpen.set(false);
    this.resetProduct();
    const parsed = productNotes(prompt) || parseProductInput(prompt).patch;
    if (prompt) {
      let conversation = this.current();
      if (!conversation) {
        conversation = { localId:conversationId(),id:null,title:prompt.slice(0,80),time:new Date(),messages:[] };
        this.conversations.update(rows => [conversation!, ...rows]);
      }
      conversation.messages.push({ role:'user',text:prompt,time:new Date() }, {role:'assistant',text:parsed.name ? `បានបំពេញព័ត៌មាន ${parsed.name} ក្នុងផលិតផលព្រាង។ សូមពិនិត្យការពិពណ៌នា និង SKU រួចបំពេញតម្លៃ ស្តុក ប្រភេទផលិតផល និងរូបភាពដែលនៅខ្វះ។ ទំហំវេចខ្ចប់មិនមែនជាស្តុកទេ។ មិនទាន់បានដាក់ស្នើផលិតផលឡើយ។` : 'The Create Product form is open. Tell me the product details to fill. You can also edit the fields yourself.',time:new Date()});
      this.current.set({ ...conversation });
    }
    const name = parsed.name || prompt.match(/product\s+(?:named|called)\s+(.+?)(?:,|\s+price\b|$)/i)?.[1]?.trim() || '';
    const price = prompt.match(/(?:price\s*\$?\s*|\$)([\d,]+(?:\.\d{1,2})?)/i)?.[1];
    const quantity = prompt.match(/(?:stock|quantity)\s*(\d+)/i)?.[1];
    const warehouse = prompt.match(/\bat\s+([^,]+?)(?:\s+branch)?(?:\.|$)/i)?.[1]?.trim() || '';
    this.draft.set({ name, price: parsed.price ?? (price ? Number(price.replace(/,/g,'')) : null), quantity: parsed.quantity ?? (quantity ? Number(quantity) : 0), warehouse: parsed.warehouse || warehouse, category: null, categoryName:parsed.category, skuDescription:parsed.skuDescription, description: parsed.description || '', color: prompt.match(/color\s+([^,]+)/i)?.[1]?.trim() || '', storage: prompt.match(/storage\s+([^,]+)/i)?.[1]?.trim() || '' });
  }
  private helpProductInput() {
    const text=this.prompt.trim(),form=this.productForm();
    if(!text || !form)return;
    const notes=productNotes(text);
    const parsed=notes?{patch:notes,issues:[]}:parseProductInput(text);
    const result=form.applyChatInput(parsed.patch);
    const missing=form.missingChatFields();
    const explanation=[result.changed.length ? `Updated ${result.changed.join(', ')} in the form.` : 'Tell me the fields to fill, for example: name Smart Watch Pro, price $199, stock 100, category Wearables.',...parsed.issues,...result.issues,missing.length?`Still needed: ${missing.join(', ')}.`:'Review the form before submitting.', 'No product has been submitted. Upload images and choose your reviewer in the form.'].join(' ');
    const current=this.current();if(current){current.messages.push({role:'user',text,time:new Date()},{role:'assistant',text:explanation,time:new Date()});this.current.set({...current});}
    this.prompt='';
  }
  productRequestSaved(request:{id:string;status:string}) {
    this.productFormBusy.set(false);
    this.appendResult(request.status === 'DRAFT' ? 'Product request saved as a draft.' : 'Product request submitted for approval. The product is not live yet.', {requestId:request.id,status:request.status}, 'PRODUCT_REQUEST');
    this.resetProduct();
  }
  resetProduct() {
    this.draft.set(null);
    this.productFormBusy.set(false);
  }
  reviewStock() {
    if (this.locked()) return;
    if (!Number.isSafeInteger(this.inventoryId) || Number(this.inventoryId) < 1 || !Number.isSafeInteger(this.stockQuantity) || Number(this.stockQuantity) < 1) {
      this.error.set('Enter a valid inventory record ID and a positive whole quantity.'); return;
    }
    this.error.set(''); this.stockReview.set(true);
  }
  restock() {
    if (!this.stockReview() || this.locked() || this.uncertain()) return;
    this.saving.set(true); this.processing.set('Adding inventory…');
    const operation: Operation = { title: 'Stock in · inventory ' + this.inventoryId, status: 'RUNNING', time: new Date() };
    this.operations.update(rows => [operation, ...rows]);
    this.management.restock(this.inventoryId!,this.stockQuantity!).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: row => {
        this.saving.set(false); this.processing.set(''); this.stockOpen.set(false); this.stockReview.set(false);
        this.updateOperation(operation,'SUCCESS',row); this.appendResult('Stock added successfully.',row,'INVENTORY_RESTOCK');
      },
      error: error => {
        this.saving.set(false); this.processing.set('');
        const uncertain = !error.status || error.status >= 500; this.uncertain.set(uncertain);
        this.updateOperation(operation, uncertain ? 'UNKNOWN' : 'FAILURE');
        this.error.set(uncertain ? 'The response was lost. Check inventory before adding stock again.' : error.error?.message || 'Could not add stock. Check the inventory record and your permissions.');
      },
    });
  }
  private appendResult(text: string, data: unknown, intent: string) {
    let conversation = this.current();
    if (!conversation) {
      conversation = { localId: conversationId(), id: null, title: text, time: new Date(), messages: [] };
      this.conversations.update(rows => [conversation!, ...rows]);
    }
    conversation.messages.push({ role:'assistant', text, time: new Date(), result: { executionId:null,status:'SUCCESS',message:text,data,intent } });
    this.current.set({ ...conversation });
  }
  label(status: string) {
    return ({ SUCCESS:'Completed', RUNNING:'Processing', NEEDS_INPUT:'Needs details', FAILURE:'Failed', DENIED:'Not allowed', UNKNOWN:'Check result' } as Record<string,string>)[status] || status;
  }
}

