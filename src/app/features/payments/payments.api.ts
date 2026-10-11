import { inject, Injectable } from "@angular/core";
import { unwrap } from "../../core/api/response";
import { map } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { Envelope, Transaction } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class PaymentsApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);
  list() {
    return this.api
      .get<Envelope<Transaction[]>>(
        "/api/v1/payment-transactions/customer/" + this.auth.userId(),
      )
      .pipe(map(unwrap));
  }
  byOrder(id: number) {
    return this.api
      .get<Envelope<Transaction[]>>("/api/v1/payment-transactions/order/" + id)
      .pipe(map(unwrap));
  }
  create(
    order_id: number,
    amount: number,
    payment_method: string,
    currency: string,
  ) {
    return this.api.data<Transaction>("/api/v1/payment-transactions", {
      order_id,
      customer_id: this.auth.userId(),
      amount,
      payment_method,
      currency,
    });
  }
  check(md5: string) {
    return this.api.post<unknown>("/api/v1/bakong/check-transaction", { md5 });
  }
  qr(qr: string, md5: string) {
    return this.api.http.post(
      this.api.url("/api/v1/bakong/get-qr-image"),
      { qr, md5 },
      { responseType: "blob" },
    );
  }
  payments() {
    return this.api.data<unknown>(
      "/api/v1/payments/user/id",
      {},
      { userId: this.auth.userId() },
    );
  }
  payment(paymentId: number) {
    return this.api.data<unknown>(
      "/api/v1/payments/user/detail",
      {},
      { userId: this.auth.userId(), paymentId },
    );
  }
  history(page = 0, size = 10, status = "") {
    const params: Record<string, string | number> = {
      userId: this.auth.userId(),
      page,
      size,
      sort: "paymentDate,desc",
    };
    if (status) params["status"] = status;
    return this.api.post<unknown>("/api/v1/payments/user/history", {}, params);
  }
  byNumber(transactionNo: string) {
    return this.api
      .get<Envelope<Transaction>>(
        "/api/v1/payment-transactions/no/" + encodeURIComponent(transactionNo),
      )
      .pipe(map(unwrap));
  }
  statusHistory(id: number) {
    return this.api
      .get<Envelope<unknown>>(
        "/api/v1/payment-transactions/" + id + "/status-history",
      )
      .pipe(map(unwrap));
  }
}
