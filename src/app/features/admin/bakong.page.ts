import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text } from "./admin.api";
@Component({
  imports: [Status, FormsModule, Icon, RouterLink],
  template: `<section class="adm-stack">
    <div class="adm-page-head">
      <div>
        <div class="adm-crumbs">
          <a routerLink="/admin">Dashboard</a>
          <span>›</span>
          <a routerLink="/admin/payments">Payments</a>
          <span>›</span>
          <span>Bakong Callback</span>
        </div>
        <h2>Process Bakong Payment Callback</h2>
        <p>
          Check a Bakong transaction by its MD5. Add the KHQR text to load the
          QR image from the payment service.
        </p>
      </div>
    </div>
    <div class="adm-cols-2">
      <form class="adm-form adm-panel adm-process" (ngSubmit)="check()">
        <div class="adm-section-title">
          <div>
            <h3>Check transaction</h3>
            <p>
              MD5 is required. The KHQR payload is used only to load the QR
              image.
            </p>
          </div>
        </div>
        <label>
          <span>MD5 <span class="adm-req">*</span></span>
          <input
            name="md5"
            [(ngModel)]="md5"
            required
            placeholder="Transaction MD5"
          />
        </label>
        <label>
          <span>KHQR payload <span class="adm-optional">(Optional)</span></span>
          <textarea
            name="qr"
            rows="4"
            [(ngModel)]="qr"
            placeholder="Required only to load the QR image."
          ></textarea>
        </label>
        <div class="adm-actions">
          <a class="adm-btn" routerLink="/admin/payments">Cancel</a>
          <button class="adm-btn adm-primary" [disabled]="busy()">
            <app-icon name="check" />
            Check transaction
          </button>
          <button
            class="adm-btn"
            type="button"
            [disabled]="!qr.trim() || !md5.trim()"
            (click)="loadQr()"
          >
            <app-icon name="refresh" />
            Load QR
          </button>
        </div>
        <app-status [busy]="busy()" [error]="error()" />
        @if (qrError()) {
          <p class="adm-badge off">{{ qrError() }}</p>
        }
      </form>
      <aside class="adm-panel">
        <div class="adm-section-title"><h3>Result</h3></div>
        @if (qrUrl()) {
          <img
            [src]="qrUrl()"
            alt="Bakong QR"
            style="width:180px;height:180px;object-fit:contain;background:#fff"
          />
        }
        @if (result(); as current) {
          <div class="adm-kv">
            <span>Code</span
            ><strong>{{
              text(field(current, "responseCode", "response_code"))
            }}</strong>
            <span>Message</span
            ><strong>{{
              text(
                field(current, "responseMessage", "response_message", "message")
              )
            }}</strong>
            <span>Status</span
            ><strong>{{ text(field(current, "status")) }}</strong>
            @if (field(current, "errorCode", "error_code") !== "") {
              <span>Error</span
              ><strong>{{
                text(field(current, "errorCode", "error_code"))
              }}</strong>
            }
          </div>
          @if (dataText()) {
            <p style="white-space:pre-wrap">{{ dataText() }}</p>
          }
        } @else {
          <div class="adm-empty">
            <strong>No result yet</strong
            ><span>No check has been sent yet.</span>
          </div>
        }
      </aside>
    </div>
  </section>`,
})
export class BakongPage extends PageState {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  md5 = "";
  qr = "";
  result = signal<Row | null>(null);
  qrUrl = signal("");
  qrError = signal("");
  field = field;
  text = text;
  constructor() {
    super();
    const id = this.route.snapshot.paramMap.get("id");
    if (id) this.md5 = decodeURIComponent(id);
  }
  check() {
    const previous = this.qrUrl();
    this.qrError.set("");
    this.run(this.api.bakongCheck(this.md5.trim()), (row) => {
      this.result.set(row);
      if (previous && previous !== this.qrUrl()) URL.revokeObjectURL(previous);
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
    this.qrError.set("");
    this.api.bakongQr(this.qr.trim(), this.md5.trim()).subscribe({
      next: async (response) => {
        const type = response.headers.get("content-type") || "";
        const body = response.body;
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
