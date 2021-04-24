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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';

import { UserImageListComponent } from './list/user.image.list.component';
import { UserImageViewComponent } from './view/user.image.view.component';

import {
  UserService,
  UserImageService,
  PreviousRouteService
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
    MatProgressSpinnerModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    MomentModule,
    AppRoutingModule
  ],
  declarations: [
    UserImageListComponent,
    UserImageViewComponent
  ],
  providers: [
    UserService,
    UserImageService,
    PreviousRouteService
  ],
  exports: []
})
export class UserImageModule {}
