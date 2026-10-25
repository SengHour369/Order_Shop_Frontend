import { inject, Injectable } from "@angular/core";
import { map } from "rxjs";
import { ApiClient } from "../../core/api/api-client";
import { AuthService } from "../../core/auth/auth.service";
import { unwrap } from "../../core/api/response";
import { Envelope } from "../../core/api/models";

export interface Profile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  image: string;
  status: string;
  birthdate?: string;
}

@Injectable({ providedIn: "root" })
export class ProfileApi {
  private api = inject(ApiClient);
  private auth = inject(AuthService);

  get() {
    return this.api
        .get<Envelope<Profile>>(
            "/api/v1/user/id/user?id=" + this.auth.userId(),
        )
        .pipe(
            map(unwrap),
            map((r) => ({
              id: r.id,
              username: r.username,
              email: r.email,
              fullName: r.fullName,
              phone: r.phone,
              image: r.image,
              status: r.status,
              birthdate: r.birthdate,
            })),
        );
  }

  current() {
    return this.api.get<Profile>("/api/v1/user/me/profile");
  }

  save(body: { fullName: string; phone: string; birthdate: string }) {
    return this.api.put<Profile>("/api/v1/user/me/profile", body);
  }

  photo(file: File) {
    const body = new FormData();
    body.append("file", file);
    return this.api.post("/api/v1/user/id/image", body, {
      id: this.auth.userId(),
    });
  }
}