import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { RichMessage } from '../../assistant/rich-message';
import { AssistantLauncherState } from '../../assistant/floating/launcher-state';
import { Router } from '@angular/router';
import { conversationId } from "../../../shared/utils/conversation-id";
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
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
import { AiImportsApi } from '../imports/ai-imports.api';
import { PermissionService } from '../../../core/auth/permission.service';

interface ProductDraft {
  name: string; description: string; category: number | null;
  price: number | null; quantity: number; warehouse: string; color: string; storage: string;
}
interface Operation { title: string; status: string; time: Date; data?: unknown; }
type Turn = NonNullable<ReturnType<AssistantPage['current']>>['messages'][number];

@Component({
  imports: [RichMessage, TranslatePipe, FormsModule, DatePipe, JsonPipe, RouterLink, Icon, AssistantProductCard, AiImportComponent],
  templateUrl: './admin-assistant.html',
  styleUrl: './admin-assistant.css',
})
export class AdminAssistantPage extends AssistantPage {
  private launcher=inject(AssistantLauncherState);
  private assistantNavigation=inject(Router);
  historyOpen=signal(false);
  responseNotice=signal('');
  async copyResponse(text:string){try{await navigator.clipboard.writeText(text);this.responseNotice.set('Response copied');}catch{this.responseNotice.set('Copy unavailable. Select the response to copy it.');}}
  vote(turn:Turn,rating:'up'|'down'){
    if(!turn.requestKey)return;
    this.assistantApi.feedback(turn.requestKey,rating).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{turn.feedback=rating;this.current.update(c=>c?{...c}:null);this.responseNotice.set('Feedback saved');},error:()=>this.responseNotice.set('Feedback could not be saved. Please try again.')});
  }
  resultPending(result?:AiResult){return result?.status==='NEEDS_CONFIRMATION'||result?.status==='RUNNING'||!!(result?.data&&typeof result.data==='object'&&'confirmationId' in result.data);}
  regenerate(index:number){if(this.locked()||this.quota.exhausted())return;const turns=this.current()?.messages||[];const last=[...turns.slice(0,index)].reverse().find(t=>t.role==='user');if(last){this.prompt=last.text;this.send();}}
  closeAssistant(){if(!this.locked()&&!this.draft()&&!this.stockOpen())void this.assistantNavigation.navigateByUrl(this.launcher.returnUrl.startsWith('/admin/assistant')?'/admin':this.launcher.returnUrl);}
  importAccess=inject(PermissionService);
  private importApi=inject(AiImportsApi);
  importBatchId=signal('');
  attachAdminFile(event:Event) {
    const input=event.target as HTMLInputElement; const file=input.files?.[0];
    if (!file || this.locked()) return;
    if (!/\.xlsx?$/i.test(file.name)) { this.attachText(event); return; }
    input.value='';
    if (!this.importAccess.has('IMPORT_UPLOAD')) {this.error.set('Excel import permission is required.'); return;}
    this.run(this.importApi.upload(file),batch=>{this.importBatchId.set(batch.id);this.view.set('imports');});
  }
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
  draftStage = signal<'edit' | 'review'>('edit');
  draftError = signal('');
  categories = signal<Row[]>([]);
  categoryError = signal('');
  productFiles: File[] = [];
  imageUrl = '';
  saving = signal(false);
  uncertain = signal(false);
  processing = signal('');
  inventoryId: number | null = null;
  stockQuantity: number | null = null;
  stockOpen = signal(false);
  stockReview = signal(false);
  sections = [['chat','Chat Bot'],['control','Control Center'],['conversations','Conversations'],['executions','Tool Execution'],['tools','Tools'],['permissions','Permissions'],['settings','Settings']];
  quickPrompts = ['Create product', 'Create promotion', 'Stock in', 'Review order', 'Show low stock', 'Generate report'];

  override ngOnInit() {
    super.ngOnInit();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params => {
      const view = params.get('view') || 'chat';
      this.view.set(this.sections.some(section => section[0] === view) ? view : 'chat');
    });
    this.destroy.onDestroy(() => { if (this.imageUrl) URL.revokeObjectURL(this.imageUrl); });
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
    if (value === 'Create product') { this.startProduct(); return; }
    if (value === 'Stock in') { this.stockOpen.set(true); this.stockReview.set(false); this.uncertain.set(false); return; }
    this.choose(({ 'Create promotion': 'Create a draft promotion', 'Review order': 'Show orders for today', 'Generate report': 'Show order counts by status' } as Record<string,string>)[value] || value);
  }
  locked() { return this.busy() || this.saving() || this.confirming(); }
  override newConversation() {
    if (this.locked()) return;
    this.resetProduct(); this.stockOpen.set(false); super.newConversation();
  }
  override open(conversation: NonNullable<ReturnType<AssistantPage['current']>>) {
    if (this.locked()) return;
    this.resetProduct(); this.stockOpen.set(false); super.open(conversation);
  }
  override send() {
    if (this.locked() || this.draft() || this.stockOpen()) return;
    if (/^\s*(?:stock in|add stock)\b/i.test(this.prompt)) {
      this.stockQuantity = Number(this.prompt.match(/(?:stock in|add stock)\s+(\d+)/i)?.[1]) || null;
      this.inventoryId = Number(this.prompt.match(/inventory(?: record)?\s*#?\s*(\d+)/i)?.[1]) || null;
      this.stockOpen.set(true); this.stockReview.set(false); this.prompt = ''; return;
    }
    if (/^\s*(?:create|add)(?: a| new| a new)? product\b/i.test(this.prompt)) {
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
    this.assistantApi.confirm(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: result => {
        this.confirming.set(false); turn.result = result; turn.text = result.message;
        this.updateOperation(operation, result.status, result.data);
        this.current.update(value => value ? { ...value } : null);
        if (result.status === 'RUNNING' && result.executionId) this.poll(turn, operation);
      },
      error: () => {
        this.confirming.set(false); this.updateOperation(operation, 'UNKNOWN');
        this.error.set('The confirmation response was lost. Check the affected record before retrying; the action may have completed.');
      },
    });
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
  startProduct(prompt = '') {
    if (this.locked()) return;
    this.resetProduct();
    if (prompt) {
      let conversation = this.current();
      if (!conversation) {
        conversation = { localId:conversationId(),id:null,title:prompt.slice(0,80),time:new Date(),messages:[] };
        this.conversations.update(rows => [conversation!, ...rows]);
      }
      conversation.messages.push({ role:'user',text:prompt,time:new Date() });
      this.current.set({ ...conversation });
    }
    const name = prompt.match(/product\s+(?:named\s+)?(.+?)(?:,|\s+price\b|$)/i)?.[1]?.trim() || '';
    const price = prompt.match(/(?:price\s*\$?\s*|\$)([\d,]+(?:\.\d{1,2})?)/i)?.[1];
    const quantity = prompt.match(/(?:stock|quantity)\s*(\d+)/i)?.[1];
    const warehouse = prompt.match(/\bat\s+([^,]+?)(?:\s+branch)?(?:\.|$)/i)?.[1]?.trim() || '';
    this.draft.set({ name, price: price ? Number(price.replace(/,/g,'')) : null, quantity: quantity ? Number(quantity) : 0, warehouse, category: null, description: prompt, color: prompt.match(/color\s+([^,]+)/i)?.[1]?.trim() || '', storage: prompt.match(/storage\s+([^,]+)/i)?.[1]?.trim() || '' });
    this.loadCategories();
  }
  loadCategories() {
    this.categoryError.set('');
    this.management.brands(1,'',100).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: page => this.categories.set(page.items),
      error: () => this.categoryError.set('Catalog categories could not load. Retry before creating a product.'),
    });
  }
  files(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []); input.value = '';
    if (!files.length) return;
    if (files.length > 5 || files.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      this.draftError.set('Choose up to 5 JPG, PNG or WebP images, each under 5 MB.'); return;
    }
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    this.productFiles = files; this.imageUrl = URL.createObjectURL(files[0]); this.draftError.set('');
  }
  reviewProduct() {
    const draft = this.draft();
    if (!draft || this.locked()) return;
    if (!draft.name.trim() || draft.name.length > 120 || !draft.category || !this.categories().some(row => Number(row['id']) === draft.category)
      || draft.price === null || !Number.isFinite(draft.price) || draft.price <= 0 || !Number.isSafeInteger(draft.quantity) || draft.quantity < 0
      || !draft.warehouse.trim() || !this.productFiles.length) {
      this.draftError.set('Provide a name, category, positive price, whole stock quantity, warehouse and product image.'); return;
    }
    this.draftError.set(''); this.draftStage.set('review');
  }
  createProduct() {
    const draft = this.draft();
    if (!draft || this.draftStage() !== 'review' || this.locked() || this.uncertain()) return;
    this.saving.set(true); this.processing.set('Creating product and initial inventory…');
    const operation: Operation = { title: 'Create product: ' + draft.name, status: 'RUNNING', time: new Date() };
    this.operations.update(rows => [operation, ...rows]);
    this.management.createProduct({ name: draft.name.trim(), description: draft.description, is_active: true, sub_category_id: draft.category,
      skus: [{ price: draft.price, quantity: draft.quantity, is_default: true, operatorProductAttribute: true, product_attributes: [['Color',draft.color],['Storage',draft.storage]].filter(([,value]) => value.trim()).map(([name,value]) => ({ name, attributes: [{ value: value.trim() }] })), inventory: { quantity: draft.quantity, warehouse_location: draft.warehouse.trim(), lowStockThreshold: 5 } }],
    }, this.productFiles).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: product => {
        this.updateOperation(operation, 'SUCCESS', product); this.saving.set(false); this.processing.set('');
        this.appendResult('Product created successfully.', product, 'PRODUCT_CREATE'); this.resetProduct();
      },
      error: error => {
        this.saving.set(false); this.processing.set('');
        const uncertain = !error.status || error.status >= 500;
        this.uncertain.set(uncertain); this.updateOperation(operation, uncertain ? 'UNKNOWN' : 'FAILURE');
        this.draftError.set(uncertain ? 'The response was lost. Check Products before starting another creation; it may have completed.' : error.error?.message || error.message || 'Product creation failed. Review the details and retry.');
      },
    });
  }
  resetProduct() {
    this.draft.set(null); this.draftStage.set('edit'); this.draftError.set(''); this.productFiles = []; this.uncertain.set(false);
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl); this.imageUrl = '';
  }
  categoryName() { return String(this.categories().find(row => Number(row['id']) === this.draft()?.category)?.['name'] || ''); }
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

