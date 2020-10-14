import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from '../../app-routing.module';
import { LoadingSpinnerModule } from '../../shared';
import { BackModule } from '../../shared';
import { PipeModule } from '../../shared';
import { MomentModule } from 'angular2-moment';

import { UserTagListComponent } from './list/user.tag.list.component';

import {
  UserService,
  UserTagService,
  TagService
} from '../../shared';

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
    LoadingSpinnerModule,
    BackModule,
    MatTooltipModule,
    PipeModule,
    MomentModule,
    AppRoutingModule
  ],
  declarations: [
    UserTagListComponent
  ],
  providers: [
    UserService,
    UserTagService,
    TagService
  ],
  exports: []
})
export class UserTagModule {}
