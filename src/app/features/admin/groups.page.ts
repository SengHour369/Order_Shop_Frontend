import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PageState } from "../../shared/page-state";
import { Icon } from "../../shared/icon";
import { Status } from "../../shared/status";
import { AdminApi, field, Row, text, tone, when } from "./admin.api";
@Component({
  imports: [Status, FormsModule, Icon, RouterLink],
  template: `<section>
    @if (screen() === "list") {
      <div class="adm-page-head">
        <div>
          <h2>Customer Groups</h2>
          <p>Permission groups from the auth service.</p>
        </div>
        <div class="adm-head-actions">
          <a class="adm-btn adm-primary" routerLink="/admin/customer-groups/add"
            ><app-icon name="plus" /> Add group</a
          >
        </div>
      </div>
    }
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (screen() === "form") {
      <div class="adm-work">
        <form class="adm-form adm-panel" (ngSubmit)="save()">
          <h3>{{ groupId ? "Edit customer group" : "Add customer group" }}</h3>
          <p>Define the details for this customer group.</p>
          <label
            >Group name<input
              name="group_name"
              [(ngModel)]="groupName"
              required
          /></label>
          <label
            >Description<textarea
              name="description"
              [(ngModel)]="groupDescription"
              rows="4"
            ></textarea>
          </label>
          <label
            >Group type
            <select name="type" [(ngModel)]="groupType">
              @for (item of types; track item) {
                <option [value]="item">{{ item }}</option>
              }
            </select>
          </label>
          <div>
            <span>Status</span>
            <div class="adm-actions">
              <label style="display:flex;align-items:center;gap:8px"
                ><input
                  type="radio"
                  name="groupActive"
                  [checked]="groupActive"
                  (change)="groupActive = true"
                />
                Active</label
              >
              <label style="display:flex;align-items:center;gap:8px"
                ><input
                  type="radio"
                  name="groupActive"
                  [checked]="!groupActive"
                  (change)="groupActive = false"
                />
                Inactive</label
              >
            </div>
          </div>
          <div class="adm-actions">
            <button class="adm-btn adm-primary" [disabled]="busy()">
              {{ groupId ? "Update group" : "Save group" }}
            </button>
            <a class="adm-btn" routerLink="/admin/customer-groups">Cancel</a>
          </div>
        </form>
        <aside class="adm-panel adm-preview">
          <h3>Preview</h3>
          <span class="adm-ico blue"><app-icon name="user" /></span>
          <strong>{{ groupName || "Group name" }}</strong>
          <p>
            {{ groupDescription || "Description appears here as you type." }}
          </p>
          <span class="adm-badge">{{ groupType || "CUSTOMER" }}</span>
          <span
            class="adm-badge"
            [class.on]="groupActive"
            [class.off]="!groupActive"
            >{{ groupActive ? "Active" : "Inactive" }}</span
          >
        </aside>
      </div>
    }
    @if (screen() === "list") {
      <div class="adm-table-card">
        <form class="adm-filter" (ngSubmit)="$event.preventDefault()">
          <input
            name="q"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Search this page by name or description"
          />
          <select
            name="status"
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilter.set($event)"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </form>
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Group name</th>
                <th>Description</th>
                <th>Group type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (row of visible(); track field(row, "id", "group_id")) {
                <tr>
                  <td>
                    {{ text(field(row, "group_name", "name", "groupName")) }}
                  </td>
                  <td>{{ text(field(row, "description")) }}</td>
                  <td>{{ text(field(row, "type")) }}</td>
                  <td>
                    <span
                      class="adm-badge"
                      [class.on]="activeRow(row)"
                      [class.off]="!activeRow(row)"
                      >{{ activeRow(row) ? "Active" : "Inactive" }}</span
                    >
                  </td>
                  <td>{{ when(field(row, "created_at", "createdAt")) }}</td>
                  <td class="adm-actions">
                    <a
                      class="adm-btn icon"
                      [routerLink]="[
                        '/admin/customer-groups/edit',
                        field(row, 'id', 'group_id'),
                      ]"
                      aria-label="Edit group"
                      ><app-icon name="edit"
                    /></a>
                    <button
                      class="adm-btn icon danger"
                      type="button"
                      aria-label="Delete group"
                      (click)="remove(row)"
                    >
                      <app-icon name="trash" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="adm-empty">
                      <strong>No customer groups</strong>
                      <p>No groups match this page.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="adm-pager">
          <span>Page {{ page }} of {{ pages() }}</span>
          <span class="adm-pages">
            <button
              class="adm-btn"
              type="button"
              [disabled]="page <= 1 || busy()"
              (click)="goto(page - 1)"
            >
              Previous
            </button>
            <button
              class="adm-btn"
              type="button"
              [disabled]="page >= pages() || busy()"
              (click)="goto(page + 1)"
            >
              Next
            </button>
            <select
              [ngModel]="size"
              (ngModelChange)="setSize($event)"
              aria-label="Rows per page"
            >
              @for (option of sizes; track option) {
                <option [ngValue]="option">{{ option }} / page</option>
              }
            </select>
          </span>
        </div>
      </div>
    }
  </section>`,
})
export class GroupsPage extends PageState {
  private api = inject(AdminApi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  screen = signal<"list" | "form" | "detail">("list");
  types = [
    "CUSTOMER",
    "VIP",
    "Loyalty",
    "Wholesale",
    "Default",
    "Behavioral",
    "Segment",
    "Corporate",
  ];
  rows = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  page = 1;
  size = 10;
  sizes = [10, 20, 50];
  query = signal("");
  statusFilter = signal("");
  editing = signal(false);
  viewing = signal<Row | null>(null);
  groupId = 0;
  groupName = "";
  groupDescription = "";
  groupType = "CUSTOMER";
  groupActive = true;
  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rows().filter((row) => {
      const active = this.activeRow(row);
      if (status === "active" && !active) return false;
      if (status === "inactive" && active) return false;
      if (!q) return true;
      return `${field(row, "group_name", "name", "groupName")} ${field(row, "description")}`
        .toLowerCase()
        .includes(q);
    });
  });
  field = field;
  text = text;
  when = when;
  constructor() {
    super();
    const url = this.router.url.split("?")[0];
    const id = Number(this.route.snapshot.paramMap.get("id") || 0);
    if (url.endsWith("/add")) {
      this.screen.set("form");
      this.open();
      return;
    }
    if (url.includes("/edit/")) {
      this.screen.set("form");
      this.run(this.api.group(id), (row) => this.edit(row));
      return;
    }
    this.load();
  }
  load(done?: string) {
    this.run(this.api.groups(this.page, this.size), (result) => {
      this.rows.set(result.items);
      this.pages.set(Math.max(1, result.pages));
      this.total.set(result.total);
      if (done) this.message.set(done);
    });
  }
  goto(page: number) {
    if (this.busy()) return;
    this.page = page;
    this.load();
  }
  setSize(size: number) {
    if (this.busy()) return;
    this.size = Number(size) || 10;
    this.page = 1;
    this.load();
  }
  activeRow(row: Row) {
    if (field(row, "is_active", "isActive") === false) return false;
    const status = field(row, "status");
    if (String(status).toUpperCase() === "BLK") return false;
    if (status && tone(status) === "off") return false;
    return true;
  }
  open() {
    this.viewing.set(null);
    this.groupId = 0;
    this.groupName = "";
    this.groupDescription = "";
    this.groupType = "CUSTOMER";
    this.groupActive = true;
    this.editing.set(true);
  }
  edit(row: Row) {
    this.viewing.set(null);
    this.groupId = Number(field(row, "id", "group_id"));
    this.groupName = String(field(row, "group_name", "name", "groupName"));
    this.groupDescription = String(field(row, "description") || "");
    this.groupType = String(field(row, "type") || "CUSTOMER");
    if (!this.types.includes(this.groupType))
      this.types = [this.groupType, ...this.types];
    this.groupActive = this.activeRow(row);
    this.editing.set(true);
  }
  save() {
    const editing = this.router.url.split("?")[0].includes("/edit/");
    if (editing && !this.groupId) return;
    this.run(
      this.api.saveGroup(
        {
          group_name: this.groupName,
          description: this.groupDescription,
          is_active: this.groupActive,
          status: this.groupActive ? "ACT" : "BLK",
          type: this.groupType || "CUSTOMER",
        },
        this.groupId || undefined,
      ),
      () => {
        this.editing.set(false);
        void this.router.navigate(["/admin/customer-groups"]);
      },
    );
  }
  remove(row: Row) {
    if (!confirm("Delete this group?")) return;
    const id = Number(field(row, "id", "group_id"));
    this.run(this.api.deleteGroup(id), () => {
      if (Number(field(this.viewing() || {}, "id", "group_id")) === id)
        this.viewing.set(null);
      this.load("Group deleted.");
    });
  }
}
