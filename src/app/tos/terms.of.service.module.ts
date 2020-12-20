import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';
import { AppRoutingModule } from '../app-routing.module';

import { TermsOfServiceComponent } from './terms.of.service.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    AppRoutingModule,
    BackModule
  ],
  declarations: [
    TermsOfServiceComponent
  ],
  providers: [],
  exports: []
})
export class TermsOfServiceModule {}