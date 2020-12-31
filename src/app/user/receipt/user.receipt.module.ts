import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserReceiptListComponent } from './list/user.receipt.list.component';
import { UserReceiptViewComponent } from './view/user.receipt.view.component';

import { StripeService } from 'ngx-stripe';
import {
  SiteTotalService,
  UserReceiptService,
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
    AppRoutingModule
  ],
  declarations: [
    UserReceiptListComponent,
    UserReceiptViewComponent
  ],
  providers: [
    StripeService,
    SiteTotalService,
    UserReceiptService,
    UserServiceService,
    UserServiceImageService
  ],
  exports: []
})
export class UserReceiptModule {}