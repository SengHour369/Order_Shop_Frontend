import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Icon } from "../../../shared/components/icon";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text, usd, when } from "../api/admin.api";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize } from "rxjs";
@Component({
  imports: [TranslatePipe, Status, FormsModule, Icon, RouterLink],
  templateUrl: "./bakong.html",
  styleUrl: "./bakong.css",
})
export class BakongPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private destroy = inject(DestroyRef);
  payment = signal<Row | null>(null);
  history = signal<{ at: string; md5: string; response: Row }[]>([]);
  orderId = "";
  lookup = "";
  amountDisplay() {
    const value = this.paymentValue("amount", "amountPaid");
    if (value === "" || value == null) return "—";
    const currency = String(this.paymentValue("currency") || "");
    return currency === "USD" ? usd(value) : `${text(value)} ${currency || "(currency unavailable)"}`;
  }
  when = when;
  md5 = "";
  qr = "";
  result = signal<Row | null>(null);
  qrUrl = signal("");
  qrError = signal("");
  qrBusy = signal(false);
  field = field;
  text = text;
  constructor() {
    super();
    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      if (/^[a-f0-9]{32}$/i.test(id)) this.md5 = id;
      else { this.lookup = id; this.loadPayment(); }
    }
    this.destroy.onDestroy(() => { if(this.qrUrl()) URL.revokeObjectURL(this.qrUrl()); });
  }
  loadPayment() {
    if (this.busy()) return;
    const orderId = Number(this.orderId);
    if (!this.lookup.trim() && (!Number.isSafeInteger(orderId) || orderId <= 0)) {
      this.error.set("Enter a transaction ID or a valid order ID."); return;
    }
    this.payment.set(null);
    this.md5 = "";
    this.result.set(null);
    this.run(this.lookup.trim() ? this.api.paymentByTransaction(this.lookup.trim()) : this.api.paymentByOrder(orderId), row => {
      this.payment.set(row);
      this.md5 = String(field(row, "qrMd5", "qr_md5", "md5") || "");
    });
  }
  paymentValue(...keys: string[]) { return field(this.payment() || {}, ...keys); }
  check() {
    if (this.busy()) return;
    if (!/^[a-f0-9]{32}$/i.test(this.md5.trim())) {
      this.error.set("Enter a valid 32-character hexadecimal MD5."); return;
    }
    this.result.set(null);
    const md5 = this.md5.trim();
    this.run(this.api.bakongCheck(md5), row => {
      this.result.set(row);
      this.history.update(history => [{ at: new Date().toISOString(), md5, response: row }, ...history].slice(0, 20));
    });
  }
  dataText() {
    const data = this.result()?.["data"];
    if (data == null || data === "") return "";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "";
    }
  }
  loadQr() {
    if (this.qrBusy()) return;
    if (!this.qr.trim() || !/^[a-f0-9]{32}$/i.test(this.md5.trim())) {
      this.qrError.set("Enter a KHQR payload and valid transaction MD5."); return;
    }
    this.qrBusy.set(true);
    this.qrError.set("");
    this.api.bakongQr(this.qr.trim(), this.md5.trim()).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.qrBusy.set(false))).subscribe({
      next: async (response) => {
        const type = response.headers.get("content-type") || "";
        const body = response.body;
        if (this.destroy.destroyed) return;
        if (!body || !type.includes("image")) {
          this.qrError.set(
            body ? await body.text() : "QR image was not returned.",
          );
          return;
        }
        const previous = this.qrUrl();
        if (previous) URL.revokeObjectURL(previous);
        this.qrUrl.set(URL.createObjectURL(body));
      },
      error: async (e) => {
        const body = e.error;
        this.qrError.set(
          body instanceof Blob
            ? await body.text()
            : e.error?.message || e.message || "QR request failed.",
        );
      },
    });
  }
}
