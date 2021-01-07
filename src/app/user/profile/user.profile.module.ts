import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { BackModule } from '../../shared';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { UserProfileComponent } from './user.profile.component';

import {
  SiteTotalService,
  PushMessageService,
  UserService
} from '../../shared';

@NgModule({
  imports: [
    MatTooltipModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatIconModule,
    CommonModule,
    MatInputModule,
    LoadingSpinnerModule,
    BackModule,
    ReactiveFormsModule
  ],
  declarations: [
    UserProfileComponent
  ],
  providers: [
    SiteTotalService,
    PushMessageService,
    UserService
  ],
  exports: []
})
export class UserProfileModule {}