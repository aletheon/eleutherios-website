import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../../shared';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { UserSettingEditComponent } from './edit/user.setting.edit.component';

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
    LoadingSpinnerModule,
    BackModule,
    ReactiveFormsModule
  ],
  declarations: [
    UserSettingEditComponent
  ],
  providers: [
    SiteTotalService,
    PushMessageService,
    UserService
  ],
  exports: []
})
export class UserSettingModule {}