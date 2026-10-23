import { AuthService } from "../../core/auth/auth.service";
import { StorefrontAccessService } from "../../core/storefront/storefront-access.service";
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogApi } from './catalog.api';
import { CartApi } from '../cart/cart.api';
import { availableStock, originalPrice, sellingPrice, hasDiscount, discountPercent, promotionName } from '../../shared/utils/product-offer';
import { Product, Sku } from '../../core/api/models';
import { CustomerStore } from '../../core/stores/customer.store';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Icon } from '../../shared/components/icon';
import { PageState } from '../../shared/utils/page-state';
import { ProductImage } from '../../shared/components/product-image';
import { Status } from '../../shared/components/status';
import { ProductReviews } from './reviews/product-reviews';

@Component({
  imports: [TranslatePipe, CurrencyPipe, FormsModule, RouterLink, Icon, Status, ProductImage, ProductReviews],
  templateUrl: './product.html', styleUrl: './product.scss',
})
export class ProductPage extends PageState {
  private api = inject(CatalogApi);
  private cart = inject(CartApi);
  private auth = inject(AuthService);
  private access = inject(StorefrontAccessService);
  store = inject(CustomerStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  product = signal<Product | null>(null);
  skuId = signal(0);
  selected = computed(() => this.product()?.skus.find(s => s.id === this.skuId()));
  images = computed(() => [...new Set([
    ...(this.product()?.main_image || []),
    ...(this.product()?.skus.map(s => s.image_url).filter((image): image is string => !!image) || []),
  ])]);
  imageIndex = signal(0);
  currentImage = computed(() => this.images()[this.imageIndex()]);
  available = computed(() => availableStock(this.selected()));
  maxQuantity = computed(() => Math.min(99, this.available()));
  originalPrice = originalPrice;
  sellingPrice = sellingPrice;
  hasDiscount = hasDiscount;
  promotionName = promotionName;
  highlights = computed(() => this.selected()?.attributes?.map(a => ({
    name: a.name, value: a.attributes.map(v => v.value).join(', '),
  })).filter(a => a.value) || []);
  brand = computed(() => this.highlights().find(a => a.name.toLowerCase() === 'brand')?.value);
  specificationsExpanded = signal(false);
  specifications = computed(() => {
    const sku = this.selected();
    const rows = (sku?.attributes || []).map(attribute => ({
      name: attribute.name,
      values: (attribute.attributes || []).map(value => value.value).filter(Boolean),
    })).filter(attribute => attribute.values.length > 0);
    if (sku) {
      rows.push({ name: 'SKU', values: [sku.sku] });
      if (sku.barcode) rows.push({ name: 'Barcode', values: [sku.barcode] });
      rows.push({ name: 'Availability', values: [this.product()?.is_active && availableStock(sku) > 0 ? 'In Stock' : 'Out of Stock'] });
    }
    return rows;
  });
  specificationColumns = computed(() => {
    const rows = this.specifications();
    const midpoint = Math.ceil(rows.length / 2);
    return [{ rows: rows.slice(0, midpoint), offset: 0 }, { rows: rows.slice(midpoint), offset: midpoint }]
      .filter(column => column.rows.length > 0);
  });
  discount = computed(() => discountPercent(this.selected()));
  quantity = 1;
  tab = signal('details');
  tabs = [
    { id: 'details', label: 'Product Details' }, { id: 'specifications', label: 'Specifications' },
    { id: 'reviews', label: 'Reviews' }, { id: 'questions', label: 'Q&A' },
  ];
  constructor() {
    super();
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.product.set(null); this.imageIndex.set(0); this.tab.set('details');
      this.run(this.api.detail(Number(params.get('id'))), p => {
        const product = { ...p, main_image: p.main_image || [], skus: p.skus || [] };
        this.product.set(product);
        this.choose(product.skus.find(s => s.is_default) || product.skus[0]);
      }, true);
    });
  }
  optionLabel(sku: Sku) {
    const attributes = sku.attributes || [];
    const optionNames = ['color', 'colour', 'size', 'storage', 'capacity'];
    const options = attributes.filter(attribute => optionNames.includes(attribute.name.toLowerCase()));
    const varying = options.length ? options : attributes.filter(attribute => {
      const values = attribute.attributes.map(value => value.value).join('|');
      return this.product()?.skus.some(other => other.id !== sku.id &&
        other.attributes?.find(candidate => candidate.name === attribute.name)?.attributes.map(value => value.value).join('|') !== values);
    });
    return varying.flatMap(attribute => attribute.attributes.map(value => value.value)).join(' / ') || sku.sku;
  }
  choose(sku?: Sku) {
    this.skuId.set(sku?.id || 0); this.quantity = 1;
    this.specificationsExpanded.set(false);
    const index = sku?.image_url ? this.images().indexOf(sku.image_url) : 0;
    this.imageIndex.set(Math.max(0, index));
  }
  moveImage(direction: number) {
    const count = this.images().length;
    if (count) this.imageIndex.set((this.imageIndex() + direction + count) % count);
  }
  canPurchase() {
    return !this.busy() && !!this.product()?.is_active && !!this.selected()
      && Number.isInteger(this.quantity) && this.quantity >= 1 && this.quantity <= this.maxQuantity();
  }
  add(buy: boolean) {
    if (!this.canPurchase()) return;
    if (!this.auth.session() && this.access.settings()?.guestCart === false) {void this.router.navigate(['/auth'],{queryParams:{returnUrl:'/shop/'+this.product()?.id}});return;}
    this.run(this.cart.add(this.skuId(), this.quantity), cart => {
      this.store.cartCount.set(cart.total_items);
      if (buy) void this.router.navigate(['/checkout']);
      else this.message.set('Added to your cart.');
    });
  }
  save(p: Product) {
    if (!this.store.toggle(p)) this.error.set('Your browser could not save this wishlist.');
  }
  async share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.message.set('Product link copied.');
    } catch { this.error.set('Could not copy the link. Copy the address from your browser.'); }
  }
}
