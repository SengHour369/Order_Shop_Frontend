import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
 provideHttpClientTesting,
 HttpTestingController,
} from "@angular/common/http/testing";
import { ProfileApi } from "./profile.api";
import { AuthService } from "../../core/auth/auth.service";

describe("Self-service profile API", () => {
 let http: HttpTestingController;
 let api: ProfileApi;

 beforeEach(() => {
  TestBed.configureTestingModule({
   providers: [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: AuthService, useValue: { userId: () => 7 } },
   ],
  });
  http = TestBed.inject(HttpTestingController);
  api = TestBed.inject(ProfileApi);
 });

 afterEach(() => http.verify());

 it("loads the current identity without a caller-supplied account ID", () => {
  let response: any;
  api.current().subscribe((p) => (response = p));
  const req = http.expectOne("/api/v1/user/me/profile");
  expect(req.request.method).toBe("GET");
  expect(req.request.params.has("id")).toBe(false);
  req.flush({ id: 7, fullName: "Shopper" });
  expect(response.fullName).toBe("Shopper");
 });

 it("updates only editable profile fields using PUT", () => {
  const body = {
   fullName: "Updated",
   phone: "+85512345678",
   birthdate: "1998-01-15",
  };
  api.save(body).subscribe();
  const req = http.expectOne("/api/v1/user/me/profile");
  expect(req.request.method).toBe("PUT");
  expect(req.request.body).toEqual(body);
  req.flush({ ...body, id: 7 });
 });
});