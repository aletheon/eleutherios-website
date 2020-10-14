import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from '../../app-routing.module';
import { PipeModule } from '../../shared';
import { AppearModule } from '../../shared';
import { FormsModule } from '@angular/forms';
import { LinkyModule } from 'angular-linky';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MomentModule } from 'angular2-moment';
import { UserActivityOpenComponent } from './user.activity.open.component';
import { UserActivityClosedComponent } from './user.activity.closed.component';

import { 
  UserActivityService,
  UserServiceService,
  UserForumRegistrantService,
  UserForumPostService,
  UserForumBlockService,
  UserForumUserBlockService,
  UserForumImageService,
  UserServiceImageService,
  UserService
} from '../../shared';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    MatIconModule,
    PipeModule,
    AppearModule,
    MomentModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSelectModule,
    FormsModule,
    LinkyModule
  ],
  declarations: [
    UserActivityOpenComponent,
    UserActivityClosedComponent
  ],
  providers: [
    UserActivityService,
    UserServiceService,
    UserForumRegistrantService,
    UserForumPostService,
    UserForumBlockService,
    UserForumUserBlockService,
    UserForumImageService,
    UserServiceImageService,
    UserService
  ],
  exports: [
    UserActivityOpenComponent,
    UserActivityClosedComponent
  ]
})
export class UserActivityModule {}