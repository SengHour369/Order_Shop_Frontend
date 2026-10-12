import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { ScannerApi, ImageCandidate, ScanResult } from './scanner.api';
import { CatalogApi } from '../catalog/catalog.api';
import { CartApi } from '../cart/cart.api';
import { CustomerStore } from '../../core/stores/customer.store';
import { Product } from '../../core/api/models';
import { PageState } from '../../shared/utils/page-state';
import { Icon } from '../../shared/components/icon';
import { ProductImage } from '../../shared/components/product-image';
import { ProductCard } from '../../shared/components/product-card';

interface Detector { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>; }
type DetectorWindow = Window & { BarcodeDetector?: new () => Detector };
export const MAX_SCAN_IMAGE_BYTES = 4000 * 1024 * 1024;

@Component({
  imports: [TranslatePipe, FormsModule, CurrencyPipe, RouterLink, Icon, ProductImage, ProductCard],
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
  code = '';
  lookupType = 'code';
  captureType = 'photo';
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
      this.cameraError.set(name === 'NotAllowedError' ? 'Camera access was denied. Allow camera access in your browser, or choose a photo.' : name === 'NotFoundError' ? 'No camera was found. Choose a product photo or enter its code instead.' : (error as Error).message === 'UNSUPPORTED' ? 'Live camera needs HTTPS or localhost. Use Take photo, Gallery, or enter a code instead.' : 'The camera could not start. Close other camera apps, try again, or choose a photo.');
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
      if (this.captureType === 'barcode') {
        const Detector = (window as DetectorWindow).BarcodeDetector;
        if (!Detector) throw new Error('Barcode scanning is not supported by this browser. Enter the SKU or barcode manually.');
        const codes = await new Detector().detect(video);
        if (this.disposed || ticket !== this.cameraTicket) return;
        const value = codes.find(code => code.rawValue)?.rawValue;
        if (!value) throw new Error('No barcode found. Move closer, keep the code inside the frame, and try again.');
        this.code = value; this.lookupType = 'code'; this.capturing.set(false); this.scan(); return;
      }
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
      this.screen.set('results'); this.message.set(response.message); this.candidates.set(response.candidates || []);
      if (response.matchType === 'AI_UNAVAILABLE') this.message.set('Photo recognition is temporarily unavailable. Search by product name, SKU, or barcode below.');
      else if (!response.candidates?.length) this.message.set('No catalog match found. Try a clearer photo or search below.');
      else if (response.exact && !response.requiresSelection && response.candidates.length === 1) this.selectCandidate(response.candidates[0]);
    });
  }
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
  sku() { return this.product()?.skus?.find(sku => sku.is_default) || this.product()?.skus?.[0]; }
  canAdd() { return !!this.product()?.is_active && !!this.sku() && (this.sku()?.quantity ?? 0) > 0 && (this.scanned() ? this.scanned()?.finalPrice != null : true); }
  discount() { const sku = this.sku(); return sku && sku.price > 0 ? Math.max(0, Math.round((1 - (sku.finalPrice ?? sku.price) / sku.price) * 100)) : 0; }
  save() { const product = this.product(); if (product) this.feedback.set(this.store.toggle(product) ? (this.store.has(product.id) ? 'Saved to wishlist' : 'Removed from wishlist') : 'Could not save your wishlist on this browser.'); }
  add() {
    const sku = this.sku(); if (!sku || !this.canAdd() || this.adding()) return;
    this.adding.set(true); this.feedback.set('');
    this.cart.add(sku.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: cart => { this.store.cartCount.set(cart.total_items); this.feedback.set('Added to cart'); },
      error: () => { this.adding.set(false); this.feedback.set('Could not add this product. Please try again.'); },
      complete: () => this.adding.set(false),
    });
  }
}
