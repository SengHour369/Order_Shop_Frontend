import { TestBed } from "@angular/core/testing";
import { of, throwError, firstValueFrom } from "rxjs";
import { AuthService } from "./auth.service";
import { KeycloakService } from "./keycloak.service";
import { ApiClient } from "../api/api-client";

describe("Login origin failures", () => {
 afterEach(() => TestBed.resetTestingModule());

 function setup(status: number) {
  TestBed.configureTestingModule({
   providers: [
    {
     provide: ApiClient,
     useValue: { post: () => throwError(() => ({ status })) },
    },
    { provide: KeycloakService, useValue: {} },
   ],
  });
  return TestBed.inject(AuthService);
 }

 it("explains how to fix a preview origin rejection without reporting missing page permissions", async () => {
  const auth = setup(403);
  await expect(firstValueFrom(auth.login("test", "test"))).rejects.toThrow(
      "GATEWAY_CORS_ORIGINS",
  );
  expect(auth.session()).toBeNull();
 });

 it("preserves credential errors and never falls back to another login endpoint", async () => {
  const auth = setup(401);
  await expect(firstValueFrom(auth.login("test", "test"))).rejects.toEqual({
   status: 401,
  });
  expect(auth.session()).toBeNull();
 });
});