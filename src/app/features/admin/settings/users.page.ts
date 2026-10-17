import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { AdminApi, field, Row, text } from "../api/admin.api";
@Component({
  imports: [TranslatePipe, FormsModule, RouterLink, Status],
  template: `
    <section>
      <div class="adm-page-head">
        <div>
          <h2>{{ "Users & Permissions" | translate }}</h2>
          <p>
            Manage accounts, permission groups, functions and their assignments.
          </p>
        </div>
      </div>
      <div class="adm-tabs">
        @for (item of tabs; track item.resource) {
          <button
            type="button"
            [disabled]="busy()"
            [class.on]="resource === item.resource"
            (click)="select(item.resource)"
          >
            {{ (item.label) | translate }}
          </button>
        }
      </div>
      <app-status [busy]="busy()" [error]="error()" [message]="message()" />
      @if (resource === "users") {
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ "Username" | translate }}</th>
                <th>{{ "Email" | translate }}</th>
                <th>{{ "Status" | translate }}</th>
                <th>{{ "Actions" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track field(row, "id")) {
                <tr>
                  <td>
                    <a [routerLink]="['/admin/users', field(row, 'id')]">{{
                      text(field(row, "username"))
                    }}</a>
                  </td>
                  <td>{{ text(field(row, "email")) }}</td>
                  <td>{{ text(field(row, "status")) }}</td>
                  <td>
                    <a class="adm-btn" [routerLink]="['/admin/users/edit', field(row, 'id')]">Edit User</a>
                    <button
                      class="adm-btn"
                      [disabled]="busy()"
                      (click)="accountStatus(row)"
                    >
                      {{ (field(row, "status") === "ACT" ? "Block" : "Activate") | translate }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">No users returned.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <form class="adm-panel adm-form" (ngSubmit)="create()">
          <h3>Add {{ label() }}</h3>
          <div class="adm-form-grid">
            @if (resource === "user-groups" || resource === "functions") {
              <label
                >{{ "Code" | translate }}<input
                  name="code"
                  [(ngModel)]="code"
                  required
                  maxlength="100"
              /></label>
              <label
                >{{ "Name" | translate }}<input
                  name="name"
                  [(ngModel)]="name"
                  required
                  maxlength="150"
              /></label>
            } @else {
              <label
                >{{ resource === "group-permissions" ? "Group ID" : "User ID"
                }}<input
                  name="owner"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="ownerId"
                  required
              /></label>
              <label
                >Function ID<input
                  name="function"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="functionId"
                  required
              /></label>
            }
          </div>
          <button class="adm-btn adm-primary" [disabled]="busy()">Add</button>
        </form>
        <div class="adm-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code / Owner</th>
                <th>Name / Function</th>
                <th>{{ "Active" | translate }}</th>
                <th>{{ "Actions" | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track id(row)) {
                <tr>
                  <td>{{ id(row) }}</td>
                  <td>
                    {{
                      text(
                        field(
                          row,
                          "group_code",
                          "func_code",
                          "group_id",
                          "user_id"
                        )
                      )
                    }}
                  </td>
                  <td>
                    {{ text(field(row, "group_name", "func_name", "func_id")) }}
                  </td>
                  <td>{{ field(row, "is_active") === true ? "Yes" : "No" }}</td>
                  <td>
                    <button
                      class="adm-btn"
                      [disabled]="busy()"
                      (click)="toggle(row)"
                    >
                      {{
                        field(row, "is_active") === true ? "Disable" : "Enable"
                      }}
                    </button>
                    <button
                      class="adm-btn"
                      [disabled]="busy()"
                      (click)="remove(row)"
                    >
                      {{ "Delete" | translate }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">No records found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="adm-pagination">
          <span>{{ total() }} records</span
          ><button
            class="adm-btn"
            [disabled]="busy() || page <= 1"
            (click)="go(-1)"
          >
            {{ "Previous" | translate }}</button
          ><span>{{ page }} / {{ pages() }}</span
          ><button
            class="adm-btn"
            [disabled]="busy() || page >= pages()"
            (click)="go(1)"
          >
            {{ "Next" | translate }}
          </button>
        </div>
      }
    </section>
  `,
})
export class UsersPage extends PageState {
  private api = inject(AdminApi);
  tabs = [
    { resource: "users", label: "Users" },
    { resource: "user-groups", label: "Permission groups" },
    { resource: "functions", label: "Functions" },
    { resource: "group-permissions", label: "Group permissions" },
    { resource: "user-permissions", label: "User permissions" },
  ];
  resource = "users";
  rows = signal<Row[]>([]);
  pages = signal(1);
  total = signal(0);
  page = 1;
  code = "";
  name = "";
  ownerId: number | null = null;
  functionId: number | null = null;
  field = field;
  text = text;
  constructor() {
    super();
    this.load();
  }
  label() {
    return this.tabs.find((tab) => tab.resource === this.resource)?.label || "";
  }
  id(row: Row) {
    const key =
      this.resource === "group-permissions"
        ? "group_permission_id"
        : this.resource === "user-permissions"
          ? "user_permission_id"
          : this.resource === "functions"
            ? "func_id"
            : "group_id";
    return Number(row[key]);
  }
  select(resource: string) {
    this.resource = resource;
    this.page = 1;
    this.rows.set([]);
    this.code = this.name = "";
    this.ownerId = this.functionId = null;
    this.load();
  }
  load(message = "") {
    const request =
      this.resource === "users"
        ? this.api.customers()
        : this.api.permissionRows(this.resource, this.page);
    this.run(request, (result) => {
      this.rows.set(result.items);
      this.pages.set(result.pages);
      this.total.set(result.total);
      this.message.set(message);
    });
  }
  go(delta: number) {
    this.page += delta;
    this.load();
  }
  create() {
    let params: Record<string, string | number>;
    if (this.resource === "user-groups" || this.resource === "functions") {
      if (!this.code.trim() || !this.name.trim()) {
        this.error.set("Code and name are required.");
        return;
      }
      params =
        this.resource === "user-groups"
          ? { groupCode: this.code.trim(), groupName: this.name.trim() }
          : { funcCode: this.code.trim(), funcName: this.name.trim() };
    } else {
      if (
        !Number.isInteger(this.ownerId) ||
        !Number.isInteger(this.functionId) ||
        Number(this.ownerId) < 1 ||
        Number(this.functionId) < 1
      ) {
        this.error.set("Enter valid owner and function IDs.");
        return;
      }
      params = {
        [this.resource === "group-permissions" ? "groupId" : "userId"]: Number(
          this.ownerId,
        ),
        funcId: Number(this.functionId),
      };
    }
    this.run(this.api.createPermissionRow(this.resource, params), () =>
      this.load("Record added."),
    );
  }
  toggle(row: Row) {
    if (!confirm("Change this permission record?")) return;
    this.run(
      this.api.permissionStatus(
        this.resource,
        this.id(row),
        field(row, "is_active") !== true,
      ),
      () => this.load("Record updated."),
    );
  }
  remove(row: Row) {
    if (!confirm("Delete this permission record?")) return;
    this.run(this.api.deletePermissionRow(this.resource, this.id(row)), () =>
      this.load("Record deleted."),
    );
  }
  accountStatus(row: Row) {
    const status = field(row, "status") === "ACT" ? "BLK" : "ACT";
    if (!confirm(`${status === "BLK" ? "Block" : "Activate"} this account?`))
      return;
    this.run(this.api.customerStatus(Number(row["id"]), status), () =>
      this.load("Account updated."),
    );
  }
}
