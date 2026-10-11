import { inject, Injectable } from "@angular/core";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { Cart } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class CartApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  load() {
    return this.api.data<Cart>(
      "/api/v1/cart/user/id/get-or-create",
      {},
      { userId: this.auth.userId() },
    );
  }
  add(skuId: number, quantity = 1) {
    return this.api.data<Cart>(
      "/api/v1/cart/user/id/items",
      { product_id: skuId, quantity },
      { userId: this.auth.userId() },
    );
  }
  update(cartItemId: number, skuId: number, quantity: number) {
    return this.api.data<Cart>(
      "/api/v1/cart/user/id/items/cartItemId",
      { product_id: skuId, quantity },
      { userId: this.auth.userId(), cartItemId },
    );
  }
  remove(cartItemId: number) {
    return this.api.data<Cart>(
      "/api/v1/cart/user/userId/items/cartItemId",
      {},
      { userId: this.auth.userId(), cartItemId },
    );
  }
  current() {
    return this.api.data<Cart>(
      "/api/v1/cart/user/id",
      {},
      { userId: this.auth.userId() },
    );
  }
  clear() {
    return this.api.data<Cart>(
      "/api/v1/cart/user/userId/clear",
      {},
      { userId: this.auth.userId() },
    );
  }
}
