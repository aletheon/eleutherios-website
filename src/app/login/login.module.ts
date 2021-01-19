import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacebookService } from 'ngx-facebook';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from '../app-routing.module';
import { ReactiveFormsModule } from '@angular/forms';
import { LoadingSpinnerModule } from '../shared';

import { LoginComponent } from './login.component';

@NgModule({
  imports: [
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatTooltipModule,
    MatInputModule,
    MatIconModule
  ],
  declarations: [
    LoginComponent
  ],
  providers: [
    FacebookService,
  ],
  exports: []
})
export class LoginModule {}
