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
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { AppearModule } from '../../shared';
import { FormsModule } from '@angular/forms';
import { MomentModule } from 'angular2-moment';
import { NgxAutoScrollModule } from "ngx-auto-scroll";
import { LinkyModule } from 'angular-linky';

import { UserForumServiceBlockListComponent } from './block/user.forum.service.block.list.component';
import { UserForumUserBlockListComponent } from './block/user.forum.user.block.list.component';
import { UserForumDetailComponent } from './detail/user.forum.detail.component';
import { UserForumEditComponent } from './edit/user.forum.edit.component';
import { UserForumForumNewComponent } from './forum/user.forum.forum.new.component';
import { UserForumImageListComponent } from './image/user.forum.image.list.component';
import { UserForumListComponent } from './list/user.forum.list.component';
import { UserForumNewComponent } from './new/user.forum.new.component';
import { UserForumServiceAddComponent } from './service/user.forum.service.add.component';
import { UserForumViewComponent } from './view/user.forum.view.component';

import {
  SiteTotalService,
  UserForumService,
  UserForumTagService,
  UserForumImageService,
  UserActivityService,
  UserForumRegistrantService,
  UserForumBreadcrumbService,
  UserServiceService,
  UserTagService,
  UserForumForumService,
  UserServiceImageService,
  UserServiceTagService,
  UserImageService,
  UserServiceForumBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  ServiceService,
  TagService,
  MessageSharingService
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
    MatExpansionModule,
    MatIconModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    AppearModule,
    FormsModule,
    MomentModule,
    NgxAutoScrollModule,
    LinkyModule,
    AppRoutingModule
  ],
  declarations: [
    UserForumServiceBlockListComponent,
    UserForumUserBlockListComponent,
    UserForumDetailComponent,
    UserForumEditComponent,
    UserForumForumNewComponent,
    UserForumImageListComponent,
    UserForumListComponent,
    UserForumNewComponent,
    UserForumServiceAddComponent,
    UserForumViewComponent
  ],
  providers: [
    SiteTotalService,
    UserForumService,
    UserForumTagService,
    UserForumImageService,
    UserActivityService,
    UserForumRegistrantService,
    UserForumBreadcrumbService,
    UserServiceService,
    UserTagService,
    UserForumForumService,
    UserServiceImageService,
    UserServiceTagService,
    UserImageService,
    UserServiceForumBlockService,
    UserForumServiceBlockService,
    UserServiceUserBlockService,
    UserForumUserBlockService,
    ServiceService,
    TagService,
    MessageSharingService
  ],
  exports: []
})
export class UserForumModule {}
