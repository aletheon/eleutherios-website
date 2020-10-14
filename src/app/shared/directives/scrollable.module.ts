import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ScrollableDirective } from './scrollable.directive';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ScrollableDirective
  ],
  providers: [],
  exports: [ScrollableDirective]
})
export class ScrollableModule {}