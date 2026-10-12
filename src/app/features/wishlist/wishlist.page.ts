import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CustomerStore } from '../../core/stores/customer.store';
import { AuthService } from '../../core/auth/auth.service';
import { Product, Sku } from '../../core/api/models';
import { CartApi } from '../cart/cart.api';
import { Icon } from '../../shared/components/icon';
import { ProductImage } from '../../shared/components/product-image';
@Component({
  imports: [TranslatePipe, FormsModule, RouterLink, CurrencyPipe, Icon, ProductImage],
  templateUrl: './wishlist.html', styleUrl: './wishlist.scss',
})
export class WishlistPage {
  readonly store = inject(CustomerStore);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartApi);
  private readonly router = inject(Router);
  query = signal(''); sort = signal('recent'); category = signal(''); view = signal('grid');
  selected = signal<Set<number>>(new Set()); pending = signal<Set<number>>(new Set());
  feedback = signal<Record<number, string>>({}); error = signal('');
  categories = computed(() => [...new Set(this.store.saved().map(p => this.categoryOf(p)).filter(Boolean))]);
  visible = computed(() => {
    const query = this.query().trim().toLowerCase();
    const products = this.store.saved().filter(p => (!this.category() || this.categoryOf(p) === this.category()) &&
      (!query || `${p.name} ${p.skus.map(s => s.sku).join(' ')}`.toLowerCase().includes(query)));
    if (this.sort() === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sort() === 'price') products.sort((a, b) => this.price(a) - this.price(b));
    if (this.sort() === 'price-desc') products.sort((a, b) => this.price(b) - this.price(a));
    return products;
  });
  selectedIds = computed(() => this.store.saved().filter(p => this.selected().has(p.id)).map(p => p.id));
  allSelected = computed(() => this.visible().length > 0 && this.visible().every(p => this.selected().has(p.id)));
  partiallySelected = computed(() => !this.allSelected() && this.visible().some(p => this.selected().has(p.id)));
  sku(p: Product): Sku | undefined { return p.skus.find(s => s.is_default) || p.skus[0]; }
  price(p: Product) { const s = this.sku(p); return s?.finalPrice ?? s?.price ?? 0; }
  original(p: Product) { const s = this.sku(p); return Math.max(s?.originalPrice ?? 0, s?.price ?? 0); }
  discount(p: Product) { return this.original(p) > this.price(p) ? Math.round((1 - this.price(p) / this.original(p)) * 100) : 0; }
  available(p: Product) { return p.is_active && (this.sku(p)?.quantity ?? 0) > 0; }
  categoryOf(p: Product) { return this.sku(p)?.attributes?.find(a => /^(category|product category)$/i.test(a.name))?.attributes[0]?.value || ''; }
  categoryCount(category: string) { return this.store.saved().filter(p => this.categoryOf(p) === category).length; }
  select(id: number) { this.selected.update(value => { const next = new Set(value); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  selectAll() {
    const remove = this.allSelected();
    this.selected.update(value => { const next = new Set(value); this.visible().forEach(p => remove ? next.delete(p.id) : next.add(p.id)); return next; });
  }
  remove(ids: number[]) {
    if (!this.store.remove(ids)) { this.error.set('Could not save on this browser.'); return; }
    this.error.set(''); this.selected.update(value => new Set([...value].filter(id => !ids.includes(id))));
    if (!this.categories().includes(this.category())) this.category.set('');
  }
  add(p: Product) {
    if (!this.available(p) || this.pending().has(p.id)) return;
    if (!this.auth.session()) { void this.router.navigate(['/auth'], { queryParams: { returnUrl: '/account/wishlist' } }); return; }
    this.pending.update(value => new Set([...value, p.id]));
    this.feedback.update(value => ({ ...value, [p.id]: '' }));
    this.cart.add(this.sku(p)!.id).pipe(finalize(() => this.pending.update(value => new Set([...value].filter(id => id !== p.id))))).subscribe({
      next: cart => { this.store.cartCount.set(cart.total_items); this.feedback.update(value => ({ ...value, [p.id]: 'Added to cart' })); },
      error: () => this.feedback.update(value => ({ ...value, [p.id]: 'Unable to add item. Try again.' })),
    });
  }
}
