import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';
import { AppearModule } from '../../shared';

import {
  SiteTotalService,
  UserForumService,
  UserServiceService,
  UserAlertService,
} from '../../shared';

import { UserAlertListComponent } from './list/user.alert.list.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    MomentModule,
    AppearModule,
    AppRoutingModule
  ],
  declarations: [
    UserAlertListComponent
  ],
  providers: [
    SiteTotalService,
    UserForumService,
    UserServiceService,
    UserAlertService,
  ],
  exports: []
})
export class UserAlertModule {}