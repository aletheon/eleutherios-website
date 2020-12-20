import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';

import { AcceptableUsePolicyComponent } from './acceptable.use.policy.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    BackModule
  ],
  declarations: [
    AcceptableUsePolicyComponent
  ],
  providers: [],
  exports: []
})
export class AcceptableUsePolicyModule {}