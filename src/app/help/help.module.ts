import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackModule } from '../shared';
import { LoadingSpinnerModule } from '../shared';
import { AppRoutingModule } from '../app-routing.module';

import { HelpComponent } from './help.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingSpinnerModule,
    AppRoutingModule,
    BackModule
  ],
  declarations: [
    HelpComponent
  ],
  providers: [],
  exports: []
})
export class HelpModule {}