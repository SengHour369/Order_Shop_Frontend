import { computed, effect, inject, Injectable, signal } from "@angular/core";
import { AuthService } from "../auth/auth.service";
import { Product } from "../api/models";
@Injectable({ providedIn: "root" })
export class CustomerStore {
  auth = inject(AuthService);
  cartCount = signal<number | null>(null);
  unread = signal<number | null>(null);
  saved = signal<Product[]>([]);
  savedCount = computed(() => this.saved().length);
  constructor() {
    effect(() => {
      const owner = this.auth.session()?.id || "guest";
      this.cartCount.set(null);
      this.unread.set(null);
      try {
        const value = JSON.parse(
          localStorage.getItem("shopkart.wishlist." + owner) || "[]",
        );
        this.saved.set(
          Array.isArray(value)
            ? value.filter(
                (p) =>
                  typeof p.id === "number" &&
                  typeof p.name === "string" &&
                  Array.isArray(p.main_image) &&
                  typeof p.is_active === "boolean" &&
                  Array.isArray(p.skus) &&
                  p.skus.every(
                    (sku: unknown) =>
                      sku !== null &&
                      typeof sku === "object" &&
                      typeof (sku as { id?: unknown }).id === "number",
                  ),
              )
            : [],
        );
      } catch {
        this.saved.set([]);
      }
    });
  }
  has(id: number) {
    return this.saved().some((p) => p.id === id);
  }
  toggle(p: Product) {
    const next = this.has(p.id)
      ? this.saved().filter((i) => i.id !== p.id)
      : [p, ...this.saved()];
    return this.persist(next);
  }
  remove(ids: readonly number[]) {
    const removed = new Set(ids);
    return this.persist(this.saved().filter(p => !removed.has(p.id)));
  }
  private persist(next: Product[]) {
    try {
      localStorage.setItem(
        "shopkart.wishlist." + (this.auth.session()?.id || "guest"),
        JSON.stringify(next),
      );
      this.saved.set(next);
      return true;
    } catch {
      return false;
    }
  }
}
