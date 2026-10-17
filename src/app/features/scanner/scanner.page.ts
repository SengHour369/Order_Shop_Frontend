import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { ScannerApi, ImageCandidate, ScanResult } from './scanner.api';
import { CatalogApi } from '../catalog/catalog.api';
import { CartApi } from '../cart/cart.api';
import { CustomerStore } from '../../core/stores/customer.store';
import { Product, Sku } from '../../core/api/models';
import { PageState } from '../../shared/utils/page-state';
import { Icon } from '../../shared/components/icon';
import { ProductImage } from '../../shared/components/product-image';

export const MAX_SCAN_IMAGE_BYTES = 4000 * 1024 * 1024;

@Component({
  imports: [CurrencyPipe, RouterLink, Icon, ProductImage],
  templateUrl: './scanner.html', styleUrl: './scanner.css',
})
export class ScannerPage extends PageState {
  api = inject(ScannerApi);
  private catalog = inject(CatalogApi);
  private cart = inject(CartApi);
  private destroy = inject(DestroyRef);
  store = inject(CustomerStore);
  video = viewChild<ElementRef<HTMLVideoElement>>('video');
  mode = signal<'camera' | 'manual'>('camera');
  screen = signal<'scan' | 'results'>('scan');
  preview = signal('');
  product = signal<Product | null>(null);
  scanned = signal<ScanResult | null>(null);
  candidates = signal<ImageCandidate[]>([]);
  related = signal<Product[]>([]);
  searchResults = signal<Product[]>([]);
  help = signal(false);
  cameraReady = signal(false);
  cameraStarting = signal(false);
  cameraError = signal('');
  torchAvailable = signal(false);
  torch = signal(false);
  adding = signal(false);
  feedback = signal('');
  capturing = signal(false);
  candidateDetails=signal<Record<number,Product>>({});
  resultFilter=signal('all');
  imageIndex=signal(0); selectedSkuId=signal(0); quantity=1;
  code = '';
  lookupType = 'code';
  private stream?: MediaStream;
  private facing: 'environment' | 'user' = 'environment';
  private cameraTicket = 0;
  private resultTicket = 0;
  private disposed = false;

  constructor() {
    super();
    this.destroy.onDestroy(() => { this.disposed = true; this.stopCamera(); this.clearPreview(); });
  }
  locked() { return this.busy() || this.capturing(); }
  setMode(mode: 'camera' | 'manual') {
    if (this.locked()) return;
    this.mode.set(mode); this.error.set('');
    if (mode === 'manual') this.stopCamera();
  }
  reset() {
    if (this.locked()) return;
    this.clearResults(); this.screen.set('scan'); this.message.set(''); this.error.set(''); this.clearPreview();
  }
  private clearPreview() {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set('');
  }
  async startCamera() {
    if (this.cameraStarting() || this.locked()) return;
    this.stopCamera(); this.clearPreview(); this.cameraError.set(''); this.cameraStarting.set(true);
    const ticket = ++this.cameraTicket;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('UNSUPPORTED');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: this.facing }, width: { ideal: 1280 }, height: { ideal: 960 } } });
      if (this.disposed || ticket !== this.cameraTicket) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const video = this.video()?.nativeElement;
      if (!video) { this.stopCamera(); return; }
      video.srcObject = stream;
      await video.play();
      if (this.disposed || ticket !== this.cameraTicket) return;
      this.cameraReady.set(true);
      const capabilities = stream.getVideoTracks()[0]?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      this.torchAvailable.set(!!capabilities?.torch);
    } catch (error) {
      if (ticket !== this.cameraTicket || this.disposed) return;
      this.stopCamera();
      const name = (error as Error).name;
      this.cameraError.set(name === 'NotAllowedError' ? 'Camera access was denied. Allow camera access in your browser, or choose a photo.' : name === 'NotFoundError' ? 'No camera was found. Choose a product photo instead.' : (error as Error).message === 'UNSUPPORTED' ? 'Live camera needs HTTPS or localhost. Use Take photo or Gallery instead.' : 'The camera could not start. Close other camera apps, try again, or choose a photo.');
    } finally { if (!this.disposed && ticket === this.cameraTicket) this.cameraStarting.set(false); }
  }
  stopCamera() {
    this.cameraTicket++;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    const video = this.video()?.nativeElement;
    if (video) video.srcObject = null;
    this.cameraReady.set(false); this.cameraStarting.set(false); this.torch.set(false); this.torchAvailable.set(false);
  }
  switchCamera() {
    if (!this.cameraReady() || this.locked()) return;
    this.facing = this.facing === 'environment' ? 'user' : 'environment'; void this.startCamera();
  }
  async toggleTorch() {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || !this.torchAvailable() || this.locked()) return;
    try { await track.applyConstraints({ advanced: [{ torch: !this.torch() } as MediaTrackConstraintSet] }); this.torch.update(value => !value); }
    catch { this.cameraError.set('Flash is not available on this camera.'); }
  }
  async capture() {
    const video = this.video()?.nativeElement;
    if (!video || !this.cameraReady() || this.locked()) return;
    this.capturing.set(true); this.error.set('');
    const ticket = this.cameraTicket;
    try {
      if (!video.videoWidth || !video.videoHeight) throw new Error('The camera is still getting ready. Try again in a moment.');
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo capture is not available. Use Gallery instead.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      let blob = await this.photoBlob(canvas, .82);
      if (blob.size > MAX_SCAN_IMAGE_BYTES) blob = await this.photoBlob(canvas, .55);
      if (this.disposed || ticket !== this.cameraTicket) return;
      this.capturing.set(false); this.recognizeFile(new File([blob], 'product-photo.jpg', { type: 'image/jpeg' }));
    } catch (error) { if (!this.disposed) this.error.set((error as Error).message || 'Capture failed. Please try again.'); }
    finally { if (!this.disposed) this.capturing.set(false); }
  }
  private photoBlob(canvas: HTMLCanvasElement, quality: number) {
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not capture a photo.')), 'image/jpeg', quality));
  }
  recognize(event: Event) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
    if (file) this.recognizeFile(file);
  }
  recognizeFile(file: File) {
    if (this.locked()) return;
    this.error.set(''); this.message.set('');
    if (file.size > MAX_SCAN_IMAGE_BYTES || file.size === 0 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Choose a JPEG, PNG, or WebP photo no larger than 4,000 MB.'); return;
    }
    this.stopCamera(); this.clearPreview();
    // Do not decode a multi-gigabyte source in the browser just for a preview.
    if (file.size <= 20 * 1024 * 1024) this.preview.set(URL.createObjectURL(file));
    this.clearResults();
    this.run(this.api.recognize(file), response => {
      this.screen.set('results'); this.message.set(response.message); this.candidates.set(response.candidates || []); this.hydrateCandidates(response.candidates || []);
      if (response.matchType === 'AI_UNAVAILABLE') this.message.set('Photo recognition is temporarily unavailable. Please try another product photo later.');
      else if (!response.candidates?.length) this.message.set('No catalog match found. Try a clearer product photo.');

    });
  }
  private hydrateCandidates(candidates:ImageCandidate[]) {
    const ticket=this.resultTicket;this.candidateDetails.set({});this.resultFilter.set('all');
    if(!candidates.length)return;
    forkJoin(candidates.map(candidate=>this.catalog.detail(candidate.productId).pipe(catchError(()=>of(null)))))
      .pipe(takeUntilDestroyed(this.destroy)).subscribe(products=>{if(ticket!==this.resultTicket)return;const details:Record<number,Product>={};for(const product of products)if(product)details[product.id]=product;this.candidateDetails.set(details);});
  }
  resultSku(candidate:ImageCandidate){const product=this.candidateDetails()[candidate.productId];return product?.skus.find(s=>s.id===candidate.productSkuId)||product?.skus.find(s=>s.is_default)||product?.skus[0];}
  visibleCandidates(){return this.candidates().filter(candidate=>this.resultFilter()==='all'||(this.resultSku(candidate)?.quantity??0)>0);}
  back(){if(this.product()){this.product.set(null);this.scanned.set(null);this.feedback.set('');}else this.reset();}
  images(){const product=this.product();return [...new Set([...(product?.main_image||[]),...(product?.skus.map(s=>s.image_url).filter((url):url is string=>!!url)||[])])];}
  chooseSku(sku:Sku){this.selectedSkuId.set(sku.id);this.quantity=1;this.imageIndex.set(Math.max(0,this.images().indexOf(sku.image_url||'')));}
  optionLabel(){return this.sku()?.description||this.scanned()?.variant?.map(v=>v.value).join(' / ')||this.sku()?.sku;}
  changeQuantity(delta:number){if(!this.adding())this.quantity=Math.max(1,Math.min(this.sku()?.quantity||1,this.quantity+delta));}
  private clearResults() {
    this.resultTicket++; this.product.set(null); this.scanned.set(null); this.candidates.set([]); this.related.set([]); this.searchResults.set([]); this.feedback.set('');
  }
  scan() {
    if (this.locked() || !this.code.trim()) return;
    this.stopCamera(); this.clearResults();
    if (this.lookupType === 'name') {
      this.run(this.catalog.list(1, this.code.trim()), page => {
        this.screen.set('results'); this.searchResults.set(page.payload || []);
        this.message.set(page.payload?.length ? 'Choose a product to view its details.' : 'No products found. Try a different name.');
      });
    } else this.run(this.api.scan(this.code.trim()), result => this.showScan(result));
  }
  private showScan(result: ScanResult) {
    this.screen.set('results'); this.scanned.set(result);
    this.message.set(result.found ? 'Product found in our catalog' : 'No product found for this code. Check the code or search by product name.');
    if (!result.found || !result.productId || !result.productSkuId) return;
    this.product.set({ id: result.productId, name: result.name || 'Product', description: '', main_image: result.imageUrl ? [result.imageUrl] : [], is_active: result.availableForSale === true,
      skus: [{ id: result.productSkuId, sku: result.sku || '', price: result.originalPrice ?? result.finalPrice ?? 0, finalPrice: result.finalPrice ?? result.originalPrice, quantity: result.availableQuantity ?? 0, is_default: true }] });
    this.selectedSkuId.set(result.productSkuId);this.quantity=1;this.imageIndex.set(0);
    const detail=this.candidateDetails()[result.productId];if(detail?.skus?.length)this.product.set(detail);
    this.loadRelated();
  }
  selectCandidate(candidate: ImageCandidate) {
    if (this.locked()) return;
    if (candidate.sku) this.run(this.api.scan(candidate.sku), result => this.showScan(result));
    else this.run(this.catalog.detail(candidate.productId), product => { this.scanned.set(null); this.product.set(product); this.screen.set('results'); this.message.set('Review the matching product'); this.loadRelated(); });
  }
  private loadRelated() {
    const ticket = this.resultTicket;
    const alternatives = this.candidates().filter(candidate => candidate.productId !== this.product()?.id).slice(0, 3);
    if (!alternatives.length) return;
    forkJoin(alternatives.map(candidate => this.catalog.detail(candidate.productId).pipe(catchError(() => of(null)))))
      .pipe(takeUntilDestroyed(this.destroy)).subscribe(products => { if (ticket === this.resultTicket) this.related.set(products.filter((product): product is Product => product !== null)); });
  }
  sku() { return this.product()?.skus?.find(s=>s.id===this.selectedSkuId()) || this.product()?.skus?.find(sku => sku.is_default) || this.product()?.skus?.[0]; }
  canAdd() { return !!this.product()?.is_active && !!this.sku() && (this.sku()?.quantity ?? 0) > 0 && (this.scanned() ? this.scanned()?.finalPrice != null : true); }
  discount() { const sku = this.sku(); return sku && sku.price > 0 ? Math.max(0, Math.round((1 - (sku.finalPrice ?? sku.price) / sku.price) * 100)) : 0; }
  save() { const product = this.product(); if (product) this.feedback.set(this.store.toggle(product) ? (this.store.has(product.id) ? 'Saved to wishlist' : 'Removed from wishlist') : 'Could not save your wishlist on this browser.'); }
  add() {
    const sku = this.sku(); if (!sku || !this.canAdd() || this.adding() || !Number.isInteger(this.quantity) || this.quantity<1 || this.quantity>sku.quantity) return;
    this.adding.set(true); this.feedback.set('');
    this.cart.add(sku.id,this.quantity).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: cart => { this.store.cartCount.set(cart.total_items); this.feedback.set('Added to cart'); },
      error: () => { this.adding.set(false); this.feedback.set('Could not add this product. Please try again.'); },
      complete: () => this.adding.set(false),
    });
  }
}
