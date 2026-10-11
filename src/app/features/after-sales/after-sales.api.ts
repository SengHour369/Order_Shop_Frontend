import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { Envelope } from "../../core/api/models";
import { unwrap } from "../../core/api/response";

export interface ReturnRequest {
  order_id: number;
  product_id: number;
  return_type: "RETURN" | "REFUND" | "EXCHANGE";
  reason: string;
  amount: number;
}

@Injectable({ providedIn: "root" })
export class AfterSalesApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);

  requestReturn(request: ReturnRequest) {
    return this.api.data<Record<string, unknown>>("/api/v1/returns/user", {
      ...request,
      customer_id: this.auth.userId(),
    });
  }

  returnDetail(id: string) {
    return this.api
      .get<Envelope<Record<string, unknown>>>(
        `/api/v1/returns/${encodeURIComponent(id)}`,
      )
      .pipe(map(unwrap));
  }

  returnHistory(id: string) {
    return this.api
      .get<Envelope<Record<string, unknown>[]>>(
        `/api/v1/returns/${encodeURIComponent(id)}/history`,
      )
      .pipe(map(unwrap));
  }

  refundDetail(id: string) {
    return this.api
      .get<Envelope<Record<string, unknown>>>(
        `/api/v1/refunds/${encodeURIComponent(id)}`,
      )
      .pipe(map(unwrap));
  }

  refundHistory(id: string) {
    return this.api
      .get<Envelope<Record<string, unknown>[]>>(
        `/api/v1/refunds/${encodeURIComponent(id)}/history`,
      )
      .pipe(map(unwrap));
  }
}
