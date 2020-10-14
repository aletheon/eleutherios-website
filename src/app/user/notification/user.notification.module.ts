import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';
import { StarRatingModule } from 'angular-star-rating';

import { UserNotificationNewComponent } from './new/user.notification.new.component';
import { UserNotificationEditComponent } from './edit/user.notification.edit.component';
import { UserNotificationListComponent } from './list/user.notification.list.component';

import {
  UserService,
  UserNotificationService,
  UserNotificationTagService,
  UserForumTagService,
  UserServiceTagService,
  UserForumService,
  UserServiceService,
  UserServiceImageService,
  UserForumImageService,
  TagService
} from '../../shared';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    MomentModule,
    StarRatingModule,
    AppRoutingModule
  ],
  declarations: [
    UserNotificationNewComponent,
    UserNotificationEditComponent,
    UserNotificationListComponent
  ],
  providers: [
    UserService,
    UserNotificationService,
    UserNotificationTagService,
    UserForumTagService,
    UserServiceTagService,
    UserForumService,
    UserServiceService,
    UserServiceImageService,
    UserForumImageService,
    TagService
  ],
  exports: []
})
export class UserNotificationModule {}
