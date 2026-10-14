import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { Order } from '../../../core/api/models';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Icon } from '../../../shared/components/icon';
import { OrdersApi } from '../orders.api';

@Component({
  selector: 'app-cancel-order-dialog',
  imports: [FormsModule, TranslatePipe, Icon],
  templateUrl: './cancel-order-dialog.html',
  styleUrl: './cancel-order-dialog.scss',
})
export class CancelOrderDialog {
  readonly order = input.required<Order>();
  readonly cancelled = output<Order>();
  private readonly api = inject(OrdersApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  readonly busy = signal(false);
  readonly error = signal('');
  reason = 'CHANGED_MIND';
  details = '';
  readonly reasons = [
    { value: 'CHANGED_MIND', label: 'Changed my mind' },
    { value: 'BETTER_PRICE', label: 'Found a better price' },
    { value: 'ORDERED_BY_MISTAKE', label: 'Ordered by mistake' },
    { value: 'SHIPPING_TOO_LONG', label: 'Shipping takes too long' },
    { value: 'OTHER', label: 'Other' },
  ];
  open() {
    if (this.busy() || this.order().status !== 'PENDING') return;
    this.reason = 'CHANGED_MIND'; this.details = ''; this.error.set('');
    this.dialog().nativeElement.showModal();
  }
  close(event?: Event) {
    if (this.busy()) { event?.preventDefault(); return; }
    this.dialog().nativeElement.close();
  }
  submit() {
    if (this.busy()) return;
    if (this.order().status !== 'PENDING') { this.error.set('Only pending orders can be cancelled.'); return; }
    if (!this.reasons.some(r => r.value === this.reason) || this.details.length > 500) {
      this.error.set('Select a reason and keep additional details within 500 characters.'); return;
    }
    this.busy.set(true); this.error.set('');
    this.api.cancel(this.order().id, this.reason, this.details.trim())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: order => {
          this.busy.set(false);
          this.dialog().nativeElement.close();
          this.cancelled.emit(order);
        },
        error: e => {
          this.busy.set(false);
          this.error.set(e.status === 0 ? 'Cannot reach the shop. Please try again shortly.' : e.error?.message || e.message || 'Cancellation failed. Please try again.');
        },
        complete: () => this.busy.set(false),
      });
  }
}
