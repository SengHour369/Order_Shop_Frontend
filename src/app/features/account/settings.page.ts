import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../core/auth/auth.service";
import { LanguageSelect } from "../../core/i18n/language-select";
import { ProfileApi, Profile } from "./profile.api";
import { AddressesApi } from "../addresses/addresses.api";
import { Address } from "../../core/api/models";
import { Icon } from "../../shared/components/icon";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";

@Component({
  imports: [
    TranslatePipe,
    RouterLink,
    FormsModule,
    LanguageSelect,
    Icon,
    SignInCard,
    Status,
  ],
  templateUrl: "./settings.html",
  styleUrl: "./settings.scss",
})
export class SettingsPage extends PageState {
  auth = inject(AuthService);
  api = inject(ProfileApi);
  private addresses = inject(AddressesApi);
  private settingsDestroy = inject(DestroyRef);
  section = "profile";
  profile = signal<Profile | null>(null);
  address = signal<Address | null>(null);
  addressError = signal(false);
  fullName = "";
  phone = "";
  birthdate = "";
  readonly today = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  constructor() {
    super();
    if (this.auth.session()) {
      this.load();
      this.addresses
          .list()
          .pipe(takeUntilDestroyed(this.settingsDestroy))
          .subscribe({
            next: (rows) =>
                this.address.set(rows.find((a) => a.is_default) ?? null),
            error: () => this.addressError.set(true),
          });
    }
  }

  load() {
    if (this.auth.session() && !this.busy()) this.run(this.api.current(), (p) => this.apply(p));
  }

  private apply(p: Profile) {
    this.profile.set(p);
    this.fullName = p.fullName ?? "";
    this.phone = p.phone ?? "";
    this.birthdate = p.birthdate ?? "";
  }

  dirty() {
    const p = this.profile();
    return (
        !!p &&
        (this.fullName !== p.fullName ||
            this.phone !== p.phone ||
            this.birthdate !== (p.birthdate ?? ""))
    );
  }

  save() {
    if (!this.auth.session() || !this.profile() || this.busy() || !this.dirty()) return;
    if (
        !this.fullName.trim() ||
        this.fullName.length > 150 ||
        !/^\+?[0-9 ()-]{7,25}$/.test(this.phone) ||
        (this.birthdate &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(this.birthdate) ||
                this.birthdate > this.today))
    ) {
      this.error.set("Enter a valid name, phone number and birth date.");
      return;
    }
    this.run(
        this.api.save({
          fullName: this.fullName.trim(),
          phone: this.phone.trim(),
          birthdate: this.birthdate,
        }),
        (p) => {
          this.apply(p);
          this.message.set("Profile saved.");
        },
    );
  }
}