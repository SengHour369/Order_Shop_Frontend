import { Component } from '@angular/core';
import { CustomerChat } from './customer-chat';
@Component({imports:[CustomerChat],template:'<app-customer-chat [pageMode]="true" />'})
export class ShoppingAssistantPage {}
