import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";

import { NoTitlePipe } from "./no.title.pipe";
import { TruncatePipe } from "./truncate.pipe";

@NgModule({
  declarations:[
    NoTitlePipe,
    TruncatePipe
  ],
  imports:[ CommonModule ],
  exports:[
    NoTitlePipe,
    TruncatePipe
  ]
})

export class PipeModule{}