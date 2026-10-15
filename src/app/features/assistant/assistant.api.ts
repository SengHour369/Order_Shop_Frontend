import { inject, Injectable } from "@angular/core";
import { ApiClient } from "../../core/api/api-client";
import { catchError, of, throwError, finalize, map } from "rxjs";
import { conversationId as requestId } from '../../shared/utils/conversation-id';
import { AssistantQuota } from './assistant-quota';
export interface AiResult {
  executionId: string | null;
  status: string;
  message: string;
  data: unknown;
  intent?: string;
  errorCode?: string;
}
export interface ChatResponse {
  requestKey?:string;
  conversationId: string;
  cardType: string;
  suggestions: string[];
  result: AiResult;
}
export interface AdminChatSummary { id: string; title: string; time: string; preview: string; }
export interface AdminTranscript { id: string; title: string; time: string; messages: { role: 'user' | 'assistant'; text: string; time: string; result?: AiResult; suggestions?: string[] }[]; }
export interface AssistantInfo { provider: string; model: string; configured: boolean; historyMinutes: number; }
@Injectable({ providedIn: "root" })
export class AssistantApi {
  private api = inject(ApiClient);
  private quota = inject(AssistantQuota);
  conversations() { return this.api.get<AdminChatSummary[]>('/api/ai/admin/conversations'); }
  conversation(id: string) { return this.api.get<AdminTranscript>('/api/ai/admin/conversations/' + encodeURIComponent(id)); }
  rename(id: string, title: string) { return this.api.patch<AdminTranscript>('/api/ai/admin/conversations/' + encodeURIComponent(id), { title }); }
  info() { return this.api.get<AssistantInfo>('/api/ai/admin/info'); }
  feedback(requestKey:string,rating:'up'|'down'){return this.api.post('/api/ai/feedback',{requestKey,rating});}
  confirm(id: string) {
    return this.api.http.post<AiResult>(this.api.url('/api/ai/confirm/' + encodeURIComponent(id)), {}).pipe(
      catchError(error => error.error?.status && typeof error.error.message === 'string'
        ? of(error.error as AiResult) : throwError(() => error)),
    );
  }
  chat(
    message: string,
    conversationId: string | null,
    administrator: boolean,
    language = "en",
    key = requestId(),
  ) {
    return this.api.http
      .post<ChatResponse>(
        this.api.url(administrator ? "/api/ai/admin/chat" : "/api/ai/chat"),
        { message, conversationId, language },
        {headers:{'Idempotency-Key':key}},
      )
      .pipe(
        catchError((error) => {
          this.quota.handle(error);
          const body = error.error;
          return body?.result?.status && typeof body.result.message === "string"
            ? of(body as ChatResponse)
            : throwError(() => error);
        }),
        map(response=>({...response,requestKey:key})),
        finalize(()=>this.quota.refresh()),
      );
  }
  execute(message: string, key: string) {
    return this.api.http.post<AiResult>(
      this.api.url("/api/ai/execute"),
      { message },
      { headers: { "Idempotency-Key": key } },
    );
  }
  status(id: string) {
    return this.api.get<unknown>(
      "/api/ai/executions/" + encodeURIComponent(id),
    );
  }
}
