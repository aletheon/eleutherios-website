import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../app-routing.module';
import { LoadingSpinnerModule } from '../shared';
import { BackModule } from '../shared';
import { PipeModule } from '../shared';
import { FormsModule } from '@angular/forms';
import { MomentModule } from 'angular2-moment';
import { LinkyModule } from 'angular-linky';
import { StarRatingModule } from 'angular-star-rating';

import { ServiceDetailComponent } from './detail/service.detail.component';
import { ServiceImageListComponent } from './image/service.image.list.component';
import { ServiceListComponent } from './list/service.list.component';
import { ServiceRateCreateComponent } from './rate/create/service.rate.create.component';
import { ServiceRateListComponent } from './rate/list/service.rate.list.component';
import { ServiceReviewCreateComponent } from './review/create/service.review.create.component';
import { ServiceReviewListComponent } from './review/list/service.review.list.component';
import { ServiceReviewViewComponent } from './review/view/service.review.view.component';

import {
  SiteTotalService,
  UserActivityService,
  UserForumRegistrantService,
  UserServiceImageService,
  UserForumImageService,
  UserWhereServingService,
  UserForumService,
  UserServiceService,
  UserTagService,
  UserForumTagService,
  UserServiceBlockService,
  UserServiceUserBlockService,
  UserForumBlockService,
  UserForumUserBlockService,
  UserServiceRateService,
  UserServiceReviewService,
  ForumService,
  ServiceService,
  TagService
} from '../shared';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    FormsModule,
    MomentModule,
    LinkyModule,
    StarRatingModule,
    AppRoutingModule
  ],
  declarations: [
    ServiceDetailComponent,
    ServiceImageListComponent,
    ServiceListComponent,
    ServiceRateCreateComponent,
    ServiceRateListComponent,
    ServiceReviewCreateComponent,
    ServiceReviewListComponent,
    ServiceReviewViewComponent
  ],
  providers: [
    SiteTotalService,
    UserActivityService,
    UserForumRegistrantService,
    UserServiceImageService,
    UserForumImageService,
    UserWhereServingService,
    UserForumService,
    UserServiceService,
    UserTagService,
    UserForumTagService,
    UserServiceBlockService,
    UserServiceUserBlockService,
    UserForumBlockService,
    UserForumUserBlockService,
    UserServiceRateService,
    UserServiceReviewService,
    ForumService,
    ServiceService,
    TagService
  ],
  exports: []
})
export class ServiceModule {}
