import { ApplicationConfig, inject, provideAppInitializer } from "@angular/core";
import { AuthService } from "./core/auth/auth.service";
import { KeycloakService } from "./core/auth/keycloak.service";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/auth/auth.interceptor";
export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(KeycloakService).initialize()),
    provideAppInitializer(() => inject(AuthService).restore()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
