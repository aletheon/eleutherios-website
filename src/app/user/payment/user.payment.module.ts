import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserPaymentNewComponent } from './new/user.payment.new.component';
import { UserPaymentListComponent } from './list/user.payment.list.component';
import { UserPaymentViewComponent } from './view/user.payment.view.component';

import { StripeService } from 'ngx-stripe';
import {
  SiteTotalService,
  UserPaymentService,
  UserServiceService,
  UserServiceImageService
} from '../../shared';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    MomentModule,
    AppRoutingModule
  ],
  declarations: [
    UserPaymentNewComponent,
    UserPaymentListComponent,
    UserPaymentViewComponent
  ],
  providers: [
    StripeService,
    SiteTotalService,
    UserPaymentService,
    UserServiceService,
    UserServiceImageService
  ],
  exports: []
})
export class UserPaymentModule {}