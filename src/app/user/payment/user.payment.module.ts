import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../../shared';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { UserPaymentNewComponent } from './new/user.payment.new.component';

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
    LoadingSpinnerModule,
    BackModule
  ],
  declarations: [
    UserPaymentNewComponent
  ],
  providers: [
    SiteTotalService,
    UserPaymentService,
    UserServiceService,
    UserServiceImageService
  ],
  exports: []
})
export class UserPaymentModule {}