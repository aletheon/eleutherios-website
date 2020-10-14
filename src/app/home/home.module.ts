import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from '../app-routing.module';
import { LoadingSpinnerModule } from '../shared';
import { AppearModule } from '../shared';
import { PipeModule } from '../shared';
import { MomentModule } from 'angular2-moment';
import { StarRatingModule } from 'angular-star-rating';
import { MatTooltipModule } from '@angular/material/tooltip/';
import { MatIconModule } from '@angular/material/icon';

import { HomeComponent } from './home.component';

import {
  ForumService,
  ServiceService,
  UserServiceService,
  UserForumService,
  UserAlertService,
  UserImageService
} from '../shared';

@NgModule({
  imports: [
    CommonModule,
    PipeModule,
    MomentModule,
    StarRatingModule,
    MatIconModule,
    MatTooltipModule,
    AppearModule,
    LoadingSpinnerModule,
    AppRoutingModule
  ],
  declarations: [
    HomeComponent
  ],
  providers: [
    ForumService,
    ServiceService,
    UserServiceService,
    UserForumService,
    UserAlertService,
    UserImageService,
  ],
  exports: []
})
export class HomeModule {}
