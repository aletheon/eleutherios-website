import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from '../app-routing.module';
import { LoadingSpinnerModule } from '../shared';
import { AppearModule } from '../shared';
import { BackModule } from '../shared';
import { PipeModule } from '../shared';
import { MomentModule } from 'angular2-moment';
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
import { NgxAutoScrollModule } from "ngx-auto-scroll";
import { LinkyModule } from 'angular-linky';

import { AnonymousHomeComponent } from './home/anonymous.home.component';
import { AnonymousForumDetailComponent } from './forum/detail/anonymous.forum.detail.component';
import { AnonymousForumImageListComponent } from './forum/image/anonymous.forum.image.list.component';
import { AnonymousServiceDetailComponent } from './service/detail/anonymous.service.detail.component';
import { AnonymousServiceImageListComponent } from './service/image/anonymous.service.image.list.component';

import {
  AnonymousForumService,
  AnonymousServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumTagService,
  UserServiceTagService
} from '../shared';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BackModule,
    PipeModule,
    MomentModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatIconModule,
    AppearModule,
    LoadingSpinnerModule,
    AppRoutingModule,
    NgxAutoScrollModule,
    LinkyModule
  ],
  declarations: [
    AnonymousHomeComponent,
    AnonymousForumDetailComponent,
    AnonymousForumImageListComponent,
    AnonymousServiceDetailComponent,
    AnonymousServiceImageListComponent
  ],
  providers: [
    AnonymousForumService,
    AnonymousServiceService,
    UserForumImageService,
    UserServiceImageService,
    UserForumTagService,
    UserServiceTagService
  ],
  exports: []
})
export class AnonymousModule {}