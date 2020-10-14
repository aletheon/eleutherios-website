import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';

import { PrivacyComponent } from './privacy.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    BackModule
  ],
  declarations: [
    PrivacyComponent
  ],
  providers: [],
  exports: []
})
export class PrivacyModule {}