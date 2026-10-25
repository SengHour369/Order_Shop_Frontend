import { inject, Injectable, signal } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { catchError, map, of, tap } from "rxjs";
import { ApiClient } from "../api/api-client";
import { AuthService } from "../auth/auth.service";

export interface StorefrontAccess {
  guestBrowsing: boolean;
  guestReviews: boolean;
  guestCart: boolean;
  guestCheckout: boolean;
  guestPayment: boolean;
  requireDeliveryAddress: boolean;
  requireGuestContactVerification: boolean;
  guestOrderTracking: boolean;
}

@Injectable({ providedIn: "root" })
export class StorefrontAccessService {
  private api = inject(ApiClient);
  readonly settings = signal<StorefrontAccess | null>(null);

  load() {
    return this.api
        .get<StorefrontAccess>("/api/v1/storefront/access-settings")
        .pipe(tap((value) => this.settings.set(value)));
  }
}

export function storefrontGuard(
    feature: keyof StorefrontAccess,
): CanActivateFn {
  return (_, state) => {
    if (inject(AuthService).session()) return true;
    const router = inject(Router);
    const denied = router.createUrlTree(["/auth"], {
      queryParams: { returnUrl: state.url, guestAccess: "unavailable" },
    });
    return inject(StorefrontAccessService)
        .load()
        .pipe(
            map((settings) => (settings[feature] ? true : denied)),
            catchError(() => of(denied)),
        );
  };
}