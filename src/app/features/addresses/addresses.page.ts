import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  Component,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { switchMap } from "rxjs";
import { AddressesApi } from "./addresses.api";
import { Address } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/components/icon";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, Icon, SignInCard, Status],
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class AddressesPage extends PageState {
  api = inject(AddressesApi);
  auth = inject(AuthService);
  router = inject(Router);
  addresses = signal<Address[]>([]);
  deleteId = signal<number | null>(null);
  constructor() {
    super();
    this.reload();
  }
  reload() {
    if (this.auth.session()) this.run(this.api.list(), rows => this.addresses.set(rows));
  }
  makeDefault(a: Address) {
    if (this.busy() || a.is_default || !this.auth.session()) return;
    const { id, ...body } = a;
    this.run(this.api.update(id, { ...body, is_default: true }).pipe(switchMap(() => this.api.list())), rows => {
      this.addresses.set(rows);
      this.message.set('Default address updated.');
    });
  }
  open(a?: Address) {
    if (this.busy() || !this.auth.session()) return;
    void this.router.navigate(a ? ['/account/addresses', a.id, 'edit'] : ['/account/addresses/add']);
  }
  remove(id: number) {
    if (this.busy() || !this.auth.session() || this.deleteId() !== id) return;
    this.run(
      this.api.remove(id).pipe(switchMap(() => this.api.list())),
      (a) => {
        this.addresses.set(a);
        this.deleteId.set(null);
      },
    );
  }
}
