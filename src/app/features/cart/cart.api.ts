import { GuestApi } from "../../core/storefront/guest.api";
import { inject, Injectable } from "@angular/core";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { map } from "rxjs";
import { unwrap } from "../../core/api/response";
import { conversationId as requestId } from "../../shared/utils/conversation-id";
import { Cart, Envelope } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class CartApi {
  private api = inject(ApiClient);
  private guest = inject(GuestApi);
  private auth = inject(AuthService);
  load() {
    if (!this.auth.session()) return this.guest.cart();
    return this.api.data<Cart>(
      "/api/v1/cart/user/id/get-or-create",
      {},
      { userId: this.auth.userId() },
    );
  }
  add(skuId: number, quantity = 1, key=requestId()) {
    if (!this.auth.session()) return this.guest.add(skuId, quantity);
    return this.change(
      "/api/v1/cart/user/id/items",
      { product_id: skuId, quantity },
      { userId: this.auth.userId() }, key,
    );
  }
  update(cartItemId: number, skuId: number, quantity: number, key=requestId()) {
    if (!this.auth.session()) return this.guest.update(cartItemId, skuId, quantity);
    return this.change(
      "/api/v1/cart/user/id/items/cartItemId",
      { product_id: skuId, quantity },
      { userId: this.auth.userId(), cartItemId }, key,
    );
  }
  remove(cartItemId: number, key=requestId()) {
    if (!this.auth.session()) return this.guest.remove(cartItemId);
    return this.change(
      "/api/v1/cart/user/userId/items/cartItemId",
      {},
      { userId: this.auth.userId(), cartItemId }, key,
    );
  }
  current() {
    if (!this.auth.session()) return this.guest.cart();
    return this.api.data<Cart>(
      "/api/v1/cart/user/id",
      {},
      { userId: this.auth.userId() },
    );
  }
  private change(path:string,body:unknown,params:Record<string,number>,key:string) {
    return this.api.http.post<Envelope<Cart>>(this.api.url(path),body,{params,headers:{'Idempotency-Key':key}}).pipe(map(unwrap));
  }
  clear() {
    if (!this.auth.session()) return this.guest.clear();
    return this.api.data<Cart>(
      "/api/v1/cart/user/userId/clear",
      {},
      { userId: this.auth.userId() },
    );
  }
}
