import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BackComponent } from './back.component';

@NgModule({
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule
  ],
  declarations: [
    BackComponent
  ],
  providers: [],
  exports: [BackComponent]
})
export class BackModule {}
