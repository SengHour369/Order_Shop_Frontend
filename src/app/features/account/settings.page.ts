import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { switchMap } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { ProfileApi, Profile } from "./profile.api";
import { Icon } from "../../shared/components/icon";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, RouterLink, Icon, SignInCard, Status],
  templateUrl: "./settings.html",
})
export class SettingsPage extends PageState {
  auth = inject(AuthService);
  api = inject(ProfileApi);
  section = "profile";
  profile = signal<Profile | null>(null);
  constructor() {
    super();
    if (this.auth.session()) {
      this.run(this.api.get(), (p) => this.profile.set(p));
    }
  }
  photo(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png"].includes(file.type)
    ) {
      this.error.set("Choose a JPG or PNG file no larger than 5 MB.");
      return;
    }
    this.run(
      this.api.photo(file).pipe(switchMap(() => this.api.get())),
      (p) => {
        this.profile.set(p);
        this.message.set("Profile photo updated.");
      },
    );
  }
}
