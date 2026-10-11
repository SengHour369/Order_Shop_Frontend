import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
export const authGuard: CanActivateFn = (_, state) =>
  inject(AuthService).session()
    ? true
    : inject(Router).createUrlTree(["/auth"], {
        queryParams: { returnUrl: state.url },
      });
