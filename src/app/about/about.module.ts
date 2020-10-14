import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';
import { AppRoutingModule } from '../app-routing.module';

import { AboutComponent } from './about.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    AppRoutingModule,
    BackModule
  ],
  declarations: [
    AboutComponent
  ],
  providers: [],
  exports: []
})
export class AboutModule {}