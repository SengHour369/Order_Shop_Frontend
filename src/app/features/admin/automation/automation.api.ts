import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../../../core/api/api-client';
export type AutomationService = 'orders' | 'payments';
export interface Execution { event_id: string; direction: 'INBOX'|'OUTBOX'; order_id: number; event_type: string; state: string; attempts: number; request_id: string; trace_id: string; last_error: string; created_at: string; }
export type MonitorRow = Record<string, string | number | null>;
@Injectable({providedIn:'root'})
export class AutomationApi {
  private readonly api = inject(ApiClient);
  events(service: AutomationService, page: number, state: string, orderId?: number) {
    const params: Record<string,string|number> = {page};
    if(state) params['state']=state;
    if(orderId) params['orderId']=orderId;
    return this.api.get<Execution[]>(`/api/v1/${service}/automation/events`,params);
  }
  logs(service: AutomationService,id:string) { return this.api.get<MonitorRow[]>(`/api/v1/${service}/automation/events/${encodeURIComponent(id)}/logs`); }
  retry(service: AutomationService,event:Execution) { return this.api.post(`/api/v1/${service}/automation/events/${encodeURIComponent(event.event_id)}/retry`,{}, {direction:event.direction}); }
  reviews(service:AutomationService) { return this.api.get<MonitorRow[]>(`/api/v1/${service}/automation/reviews`); }
  deliveries(orderId?:number) { return this.api.get<MonitorRow[]>('/api/notifications/admin/delivery',orderId?{orderId}:{}); }
  review(orderId:number) { return this.api.post<unknown>(`/api/v1/orders/automation/orders/${orderId}/review`); }
}
