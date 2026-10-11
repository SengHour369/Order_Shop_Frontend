import { inject, Injectable } from "@angular/core";
import { ApiClient } from "../../core/api/api-client";
import { Notice, SpringPage } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class NotificationsApi {
  private api = inject(ApiClient);
  count() {
    return this.api.get<{
      count: number;
    }>("/api/notifications/unread-count");
  }
  list(page = 1) {
    return this.api.get<SpringPage<Notice>>(
      "/api/notifications?page=" + page + "&size=20",
    );
  }
  get(id: number) {
    return this.api.get<Notice>("/api/notifications/" + id);
  }
  read(id: number) {
    return this.api.http.patch(
      this.api.url("/api/notifications/" + id + "/read"),
      {},
    );
  }
  readAll() {
    return this.api.http.patch(this.api.url("/api/notifications/read-all"), {});
  }
  preferences() {
    return this.api.get<{
      aiEmail: boolean;
    }>("/api/notifications/preferences");
  }
  setPreferences(aiEmail: boolean) {
    return this.api.http.patch(this.api.url("/api/notifications/preferences"), {
      aiEmail,
    });
  }
}
