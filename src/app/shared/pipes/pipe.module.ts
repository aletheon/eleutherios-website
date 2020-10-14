import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";

import { NoTitlePipe } from "./no.title.pipe";
import { TruncatePipe } from "./truncate.pipe";
import { DownloadImageUrlPipe } from "./downloadImageUrl.pipe";
// import { TimeAgoPipe } from 'time-ago-pipe';

@NgModule({
  declarations:[
    NoTitlePipe,
    TruncatePipe,
    DownloadImageUrlPipe
    // TimeAgoPipe
  ],
  imports:[ CommonModule ],
  exports:[
    NoTitlePipe,
    TruncatePipe,
    DownloadImageUrlPipe
    // TimeAgoPipe
  ]
})

export class PipeModule{}