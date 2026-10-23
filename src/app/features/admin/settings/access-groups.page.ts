import { PageAccessDenied } from '../../../shared/components/page-access-denied';
import { CanAccessDirective } from '../../../core/auth/can-access.directive';
import { PermissionService } from "../../../core/auth/permission.service";
import { PermissionPicker } from "./permission-picker";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { concatMap, forkJoin, from, of, switchMap, tap, toArray } from "rxjs";
import { PageState } from "../../../shared/utils/page-state";
import { Status } from "../../../shared/components/status";
import { AdminApi, Row, when } from "../api/admin.api";

@Component({
  imports: [PageAccessDenied, CanAccessDirective, TranslatePipe, FormsModule, RouterLink, Status, PermissionPicker],
  templateUrl: "./access-groups.html",
  styleUrls: ["../styles/reference.css", "../styles/operations.css", "./access-groups.css"],
})
export class AccessGroupsPage extends PageState {
  access = inject(PermissionService);
  private api = inject(AdminApi);
  private router = inject(Router);
  creating = this.router.url.endsWith("/add");
  rows = signal<Row[]>([]);
  functions = signal<Row[]>([]);
  query = "";
  name = "";
  display = "";
  chosen = new Set<number>();
  savedPermissions = new Set<number>();
  createdId: number | null = null;
  when = when;

  constructor() {
    super();
    this.run(
      forkJoin({
        groups: this.api.allGroups(),
        functions: this.api.allPermissionRows("functions"),
      }),
      (result) => {
        this.rows.set(result.groups);
        this.functions.set(result.functions);
      },
    );
  }

  visible() {
    return this.rows().filter((row) =>
      `${row["group_name"]} ${row["group_code"]} ${row["display"]}`
        .toLowerCase()
        .includes(this.query.toLowerCase()),
    );
  }

  activeCount() {
    return this.rows().filter((row) => row["is_active"] === true).length;
  }

  save() {
    if (this.busy() || !this.access.has("USER_GROUP_CREATE") || !this.access.has("GRP_PERM_CREATE")) return;
    if (!this.name.trim()) {
      this.error.set("Group name is required.");
      return;
    }
    const group = this.createdId
      ? of({ group_id: this.createdId } as Row)
      : this.api.saveGroup({
          group_name: this.name.trim(), description: this.display.trim(),
          is_active: true, status: "ACT", type: this.router.url.includes("customer-groups") ? "CUSTOMER" : "STAFF",
        });
    this.run(
      group.pipe(
        tap((row) => {
          this.createdId = Number(row["group_id"]);
          if (!this.createdId)
            throw new Error("The service did not return a group ID.");
        }),
        switchMap(() =>
          from(
            [...this.chosen].filter((id) => !this.savedPermissions.has(id)),
          ).pipe(
            concatMap((id) =>
              this.api
                .createPermissionRow("group-permissions", {
                  groupId: this.createdId!,
                  funcId: id,
                })
                .pipe(tap(() => this.savedPermissions.add(id))),
            ),
            toArray(),
          ),
        ),
      ),
      () => void this.router.navigateByUrl("/admin/groups"),
    );
  }
}
