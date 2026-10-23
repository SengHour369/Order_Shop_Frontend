import { inject, Injectable } from "@angular/core";
import { ApiClient } from "../../core/api/api-client";
import { catchError, of, throwError, finalize, map } from "rxjs";
import { conversationId as requestId } from '../../shared/utils/conversation-id';
import { AssistantQuota } from './assistant-quota';
import { ChatPresentation } from './chat-presentation';
export interface AiResult {
  presentation?: ChatPresentation;
  executionId: string | null;
  status: string;
  message: string;
  data: unknown;
  intent?: string;
  errorCode?: string;
}
export interface ChatResponse {
  presentation?: ChatPresentation;
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
  transcribe(audio: Blob, language: string) {
    const body = new FormData(); body.append("audio", audio, "recording"); body.append("language", language);
    return this.api.post<{text:string}>("/api/ai/voice/transcriptions", body);
  }
  conversations() { return this.api.get<AdminChatSummary[]>('/api/ai/admin/conversations'); }
  conversation(id: string) { return this.api.get<AdminTranscript>('/api/ai/admin/conversations/' + encodeURIComponent(id)); }
  rename(id: string, title: string) { return this.api.patch<AdminTranscript>('/api/ai/admin/conversations/' + encodeURIComponent(id), { title }); }
  info() { return this.api.get<AssistantInfo>('/api/ai/admin/info'); }
  feedback(requestKey:string,rating:'up'|'down'){return this.api.post('/api/ai/feedback',{requestKey,rating});}
  visual(image:File,key=requestId()) {
    const body=new FormData();body.append('image',image);
    return this.api.http.post<AiResult>(this.api.url('/api/ai/visual-search'),body,{headers:{'Idempotency-Key':key}}).pipe(
      catchError(error => {this.quota.handle(error);return error.error?.status ? of(error.error as AiResult) : throwError(()=>error);}),
      finalize(()=>this.quota.refresh()));
  }
  tool(name: string, parameters: Record<string,unknown>, key=requestId(), conversationId:string|null=null) {
    return this.api.http.post<AiResult>(this.api.url('/api/ai/tools/'+encodeURIComponent(name)),parameters,{headers:conversationId ? {'Idempotency-Key':key,'X-Conversation-ID':conversationId} : {'Idempotency-Key':key}}).pipe(
      catchError(error => error.error?.status && typeof error.error.message === 'string' ? of(error.error as AiResult) : throwError(()=>error)));
  }
  confirm(id: string, conversationId:string|null=null) {
    return this.api.http.post<AiResult>(this.api.url('/api/ai/confirm/' + encodeURIComponent(id)), {}, {headers: conversationId ? {'X-Conversation-ID':conversationId} : {}}).pipe(
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
        map(response=>({...response,result:{...response.result,presentation:response.presentation},requestKey:key})),
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
