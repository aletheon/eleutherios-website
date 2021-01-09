import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { BackModule } from '../../shared';
import { AppearModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';
import { LoadingSpinnerModule } from '../../shared';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { AppRoutingModule } from '../../app-routing.module';
import { LinkyModule } from 'angular-linky';
import { StarRatingModule } from 'angular-star-rating';

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
    AppRoutingModule,
    CommonModule,
    MatInputModule,
    LoadingSpinnerModule,
    BackModule,
    AppearModule,
    PipeModule,
    MomentModule,
    ReactiveFormsModule,
    LinkyModule,
    StarRatingModule
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