import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';
import { LinkyModule } from 'angular-linky';
import { StarRatingModule } from 'angular-star-rating';
import { NgxQRCodeModule } from '@techiediaries/ngx-qrcode';

import { UserServiceNewComponent } from './new/user.service.new.component';
import { UserServiceEditComponent } from './edit/user.service.edit.component';
import { UserServiceListComponent } from './list/user.service.list.component';
import { UserServiceRateCreateComponent } from './rate/create/user.service.rate.create.component';
import { UserServiceRateListComponent } from './rate/list/user.service.rate.list.component';
import { UserServiceReviewCreateComponent } from './review/create/user.service.review.create.component';
import { UserServiceReviewListComponent } from './review/list/user.service.review.list.component';
import { UserServiceReviewViewComponent } from './review/view/user.service.review.view.component';
import { UserServiceImageListComponent } from './image/user.service.image.list.component';
import { UserServiceDetailComponent } from './detail/user.service.detail.component';
import { UserServiceForumBlockListComponent } from './block/user.service.forum.block.list.component';
import { UserServiceUserBlockListComponent } from './block/user.service.user.block.list.component';

import { CurrencyPipe } from '@angular/common';

import {
  SiteTotalService,
  UserForumTagService,
  UserServiceForumBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  UserForumService,
  UserForumRegistrantService,
  UserWhereServingService,
  UserServiceService,
  UserTagService,
  ServiceService,
  TagService
} from '../../shared';

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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    MomentModule,
    LinkyModule,
    StarRatingModule,
    NgxQRCodeModule,
    AppRoutingModule
  ],
  declarations: [
    UserServiceNewComponent,
    UserServiceEditComponent,
    UserServiceListComponent,
    UserServiceRateCreateComponent,
    UserServiceRateListComponent,
    UserServiceReviewCreateComponent,
    UserServiceReviewListComponent,
    UserServiceReviewViewComponent,
    UserServiceImageListComponent,
    UserServiceDetailComponent,
    UserServiceForumBlockListComponent,
    UserServiceUserBlockListComponent
  ],
  providers: [
    SiteTotalService,
    UserForumTagService,
    UserServiceForumBlockService,
    UserForumServiceBlockService,
    UserServiceUserBlockService,
    UserForumUserBlockService,
    UserForumService,
    UserForumRegistrantService,
    UserWhereServingService,
    UserServiceService,
    UserTagService,
    ServiceService,
    TagService,
    CurrencyPipe
  ],
  exports: []
})
export class UserServiceModule {}