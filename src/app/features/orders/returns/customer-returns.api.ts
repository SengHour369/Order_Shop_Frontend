import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiClient } from '../../../core/api/api-client';
import { AuthService } from '../../../core/auth/auth.service';
import { Envelope, SpringPage } from '../../../core/api/models';
import { unwrap } from '../../../core/api/response';
export interface CustomerReturnSummary {
  return_id: string; status: string; return_type: string; requested_at: string; amount: number;
}
export interface CustomerReturnDetail extends CustomerReturnSummary {
  order_id: number; order_no: string; order_date: string; product_id: number;
  reason: string;
  history: {status:string; changed_at:string}[];
  refund: {amount:number; status:string; requested_at:string; processed_at:string|null}|null;
}
@Injectable({providedIn:'root'})
export class CustomerReturnsApi {
  private readonly api=inject(ApiClient);
  private readonly auth=inject(AuthService);
  list(page=0) {
    return this.api.get<Envelope<SpringPage<CustomerReturnSummary>>>('/api/v1/returns/user',{userId:this.auth.userId(),page}).pipe(map(unwrap));
  }
  detail(id:string) {
    return this.api.get<Envelope<CustomerReturnDetail>>('/api/v1/returns/user/'+encodeURIComponent(id),{userId:this.auth.userId()}).pipe(map(unwrap));
  }
}
