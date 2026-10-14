import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationsApi } from './notifications.api';
import { AuthService } from '../../core/auth/auth.service';
import { Icon } from '../../shared/components/icon';
import { PageState } from '../../shared/utils/page-state';
import { Status } from '../../shared/components/status';
import { SignInCard } from '../../shared/components/sign-in-card';
@Component({imports:[TranslatePipe,RouterLink,FormsModule,Icon,Status,SignInCard],templateUrl:'./notification-settings.html',styleUrl:'./notification-settings.scss'})
export class NotificationSettingsPage extends PageState {
  auth=inject(AuthService);api=inject(NotificationsApi);ready=signal(false);saved=signal(false);email=false;
  types=[
    {name:'Orders',icon:'box',tone:'green',description:'Order confirmation, payment updates, shipping status, delivery notifications.',enabled:true},
    {name:'Promotions',icon:'tag',tone:'pink',description:'Special offers, discounts, flash sales, and new product promotions.',enabled:false},
    {name:'Returns',icon:'box',tone:'orange',description:'Return request updates, refund status, and return completion.',enabled:false},
    {name:'Account & Security',icon:'shield',tone:'purple',description:'Password changes, login alerts, account updates, and security notifications.',enabled:false},
    {name:'Product Updates',icon:'bell',tone:'blue',description:'Back in stock alerts, price drops, and product recommendations.',enabled:false},
    {name:'System Notifications',icon:'settings',tone:'gray',description:'Maintenance, feature updates, and important announcements.',enabled:false}
  ];
  constructor(){super();if(this.auth.session())this.load();}
  load(){if(!this.auth.session()||this.busy())return;this.run(this.api.preferences(),p=>{this.email=p.aiEmail;this.saved.set(p.aiEmail);this.ready.set(true);});}
  save(){if(!this.auth.session()||!this.ready()||this.busy()||this.email===this.saved())return;const desired=this.email;this.run(this.api.setPreferences(desired),()=>{this.saved.set(desired);this.message.set('Notification preferences saved.');});}
}
