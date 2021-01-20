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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../app-routing.module';
import { LoadingSpinnerModule } from '../shared';
import { BackModule } from '../shared';
import { PipeModule } from '../shared';
import { AppearModule } from '../shared';
import { FormsModule } from '@angular/forms';
import { MomentModule } from 'angular2-moment';
import { NgxAutoScrollModule } from "ngx-auto-scroll";
import { LinkyModule } from 'angular-linky';
import { NgxQRCodeModule } from '@techiediaries/ngx-qrcode';

import { ForumDetailComponent } from './detail/forum.detail.component';
import { ForumImageListComponent } from './image/forum.image.list.component';
import { ForumListComponent } from './list/forum.list.component';

import {
  SiteTotalService,
  UserService,
  UserForumService,
  UserImageService,
  UserForumBreadcrumbService,
  UserTagService,
  UserActivityService,
  UserForumRegistrantService,
  UserServiceBlockService,
  UserServiceUserBlockService,
  UserForumBlockService,
  UserForumUserBlockService,
  UserServiceImageService,
  UserForumImageService,
  UserServiceTagService,
  UserForumTagService,
  UserServiceService,
  ForumService,
  ServiceService,
  TagService,
  MessageSharingService
} from '../shared';

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
    MatExpansionModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    AppearModule,
    FormsModule,
    MomentModule,
    AppRoutingModule,
    NgxAutoScrollModule,
    NgxQRCodeModule,
    LinkyModule
  ],
  declarations: [
    ForumDetailComponent,
    ForumImageListComponent,
    ForumListComponent
  ],
  providers: [
    SiteTotalService,
    UserService,
    UserForumService,
    UserImageService,
    UserForumBreadcrumbService,
    UserTagService,
    UserActivityService,
    UserForumRegistrantService,
    UserServiceBlockService,
    UserServiceUserBlockService,
    UserForumBlockService,
    UserForumUserBlockService,
    UserServiceImageService,
    UserForumImageService,
    UserServiceTagService,
    UserForumTagService,
    UserServiceService,
    ForumService,
    ServiceService,
    TagService,
    MessageSharingService
  ],
  exports: []
})
export class ForumModule {}