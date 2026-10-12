import { DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Observable, Subscription } from "rxjs";
export class PageState {
  busy = signal(false);
  error = signal("");
  message = signal("");
  private ticket = 0;
  private request?: Subscription;
  private destroyRef = inject(DestroyRef);
  run<T>(source: Observable<T>, success: (value: T) => void, replace = false) {
    if (this.busy() && !replace) return;
    this.request?.unsubscribe();
    const ticket = ++this.ticket;
    this.busy.set(true);
    this.error.set("");
    this.message.set("");
    this.request = source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (value) => {
        if (ticket !== this.ticket) return;
        this.busy.set(false);
        success(value);
      },
      error: (e) => {
        if (ticket !== this.ticket) return;
        this.error.set(
          e.status === 0
            ? "Cannot reach the shop. Please try again shortly."
            : e.error?.message ||
                e.message ||
                "Request failed. Please try again.",
        );
        this.busy.set(false);
      },
      complete: () => {
        if (ticket === this.ticket) this.busy.set(false);
      },
    });
  }
}
