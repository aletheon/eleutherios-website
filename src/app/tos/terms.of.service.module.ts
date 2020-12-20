import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';

import { TermsOfServiceComponent } from './terms.of.service.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    BackModule
  ],
  declarations: [
    TermsOfServiceComponent
  ],
  providers: [],
  exports: []
})
export class TermsOfServiceModule {}