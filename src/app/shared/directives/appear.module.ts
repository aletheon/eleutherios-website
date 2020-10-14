import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppearDirective } from './appear.directive';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    AppearDirective
  ],
  providers: [],
  exports: [ AppearDirective ]
})
export class AppearModule {}