import { ActivatedRoute } from "@angular/router";
import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { forkJoin } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { AdminApi, Row, text, when } from "../api/admin.api";

@Component({
  imports: [PageAccessDenied, TranslatePipe, FormsModule, Status],
  template: `@if (accessDenied()) { <app-page-access-denied /> } @else {
    <div class="adm-page-head">
      <div>
        <h2>{{ "Service Activity" | translate }}</h2>
        <p>{{guestActivity ? "Guest order creation audit. Contact details and browser credentials are excluded." : "Review the latest background check and service audit records."}}</p>
      </div>
      <button
        class="adm-btn"
        [disabled]="monitorBusy()"
        (click)="loadMonitor()"
      >
        Refresh status
      </button>
    </div>
    <app-status [busy]="monitorBusy()" [error]="monitorError()" />
    <div class="adm-stats">
      <article class="adm-card stat">
        <span class="k">Background check</span
        ><strong>{{ text(monitor()?.["outcome"]) }}</strong>
        <p>{{ text(monitor()?.["detail"]) }}</p>
      </article>
      <article class="adm-card stat">
        <span class="k">Last completed</span
        ><strong style="font-size:18px">{{
          when(monitor()?.["finishedAt"])
        }}</strong>
        <p>
          {{
            monitor()?.["healthy"] === true
              ? "Healthy"
              : monitor()?.["healthy"] === false
                ? "Needs attention"
                : "No result available"
          }}
        </p>
      </article>
      <article class="adm-card stat">
        <span class="k">Signed-in staff</span
        ><strong style="font-size:18px">{{ (text(staff()?.["username"])) | translate }}</strong>
        <p>{{ authorities() }}</p>
      </article>
    </div>
    <section class="adm-table-card">
      <form class="adm-filter" (ngSubmit)="page = 1; loadAudit()">
        <label
          >Service<select name="service" [(ngModel)]="service">
            @for (item of services; track item) {
              <option [value]="item">{{ item }}</option>
            }
          </select></label
        >
        <label
          >Actor ID<input
            name="actorId"
            [(ngModel)]="actorId"
            placeholder="All actors"
        /></label>
        <label
          >Resource ID<input
            name="resourceId"
            [(ngModel)]="resourceId"
            placeholder="All resources"
        /></label>
        <button class="adm-btn adm-primary" [disabled]="busy()">
          Apply filters
        </button>
      </form>
      <app-status [busy]="busy()" [error]="error()" />
      <div class="adm-table-scroll">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>{{ "Action" | translate }}</th>
              <th>Resource</th>
              <th>Actor</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row["id"]) {
              <tr>
                <td>{{ when(row["occurredAt"]) }}</td>
                <td>{{ text(row["action"]) }}</td>
                <td>
                  {{ text(row["resourceType"]) }} ·
                  {{ text(row["resourceId"]) }}
                </td>
                <td>{{ text(row["actorId"]) }}</td>
                <td>{{ text(row["result"]) }}</td>
              </tr>
            } @empty {
              @if (!busy()) {
                <tr>
                  <td colspan="5">
                    {{
                      error()
                        ? "Audit records could not be loaded."
                        : "No matching audit records."
                    }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button
          [disabled]="busy() || page <= 1"
          (click)="page = page - 1; loadAudit()"
        >
          {{ "Previous" | translate }}</button
        ><span>Page {{ page }} of {{ pages() }} · {{ total() }} records</span
        ><button
          [disabled]="busy() || page >= pages()"
          (click)="page = page + 1; loadAudit()"
        >
          {{ "Next" | translate }}
        </button>
      </div>
    </section>
   }`,
})
export class OperationsPage extends PageState {
  private api = inject(AdminApi);
  guestActivity = !!inject(ActivatedRoute).snapshot.data["guestActivity"];
  private destroy = inject(DestroyRef);
  readonly services = [
    "auth",
    "catalog",
    "order",
    "payment",
    "admin",
    "ai",
    "notification",
  ] as const;
  service: (typeof this.services)[number] = "order";
  actorId = "";
  resourceId = "";
  page = 1;
  rows = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  monitor = signal<Row | null>(null);
  staff = signal<Row | null>(null);
  monitorBusy = signal(false);
  monitorError = signal("");
  text = text;
  when = when;
  constructor() {
    super();
    this.loadMonitor();
    this.loadAudit();
  }
  authorities() {
    const values = this.staff()?.["authorities"];
    return Array.isArray(values) ? values.join(", ") : "—";
  }
  loadMonitor() {
    if (this.monitorBusy()) return;
    this.monitorBusy.set(true);
    this.monitorError.set("");
    forkJoin({ monitor: this.api.monitor(), staff: this.api.staffSession() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.monitor.set(result.monitor);
          this.staff.set(result.staff);
          this.monitorBusy.set(false);
        },
        error: (error) => {
          this.monitorError.set(
            error.error?.message ||
              error.message ||
              "Service status is unavailable.",
          );
          this.monitorBusy.set(false);
        },
      });
  }
  loadAudit() {
    const filters: Record<string, string> = {};
    if (this.guestActivity) filters["resourceType"] = "GUEST_ORDER";
    if (this.actorId.trim()) filters["actorId"] = this.actorId.trim();
    if (this.resourceId.trim()) filters["resourceId"] = this.resourceId.trim();
    this.run(
      this.api.auditLogs(this.service, this.page, 20, filters),
      (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.pages.set(result.pages);
      },
    );
  }
}
