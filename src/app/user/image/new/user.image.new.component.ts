import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import {
  UserImageService,
  Upload
} from '../../../shared';

import { Observable, BehaviorSubject } from 'rxjs';
import * as _ from "lodash";

@Component({
  selector: 'user-image-new',
  templateUrl: './user.image.new.component.html',
  styleUrls: ['./user.image.new.component.css']
})
export class UserImageNewComponent implements OnInit, OnDestroy, AfterViewInit  {
  selectedFiles: FileList;
  currentUpload: Upload;

  private _loading = new BehaviorSubject(false);

  public loading: Observable<boolean> = this._loading.asObservable();
  
  constructor(private auth: AuthService,
    private userImageService: UserImageService) {
  }

  detectFiles (event) {
    this.selectedFiles = event.target.files;
  }

  uploadSingle () {
    let file = this.selectedFiles.item(0);
    this.currentUpload = new Upload(file);
    this.userImageService.create(this.auth.uid, this.currentUpload)
  }

  uploadMulti () {
    let files = this.selectedFiles
    let filesIndex = _.range(files.length)
    _.each(filesIndex, (idx) => {
      this.currentUpload = new Upload(files[idx]);
      this.userImageService.create(this.auth.uid, this.currentUpload)}
    )
  }

  ngOnDestroy () {
  }

  ngAfterViewInit () {
  }
  
  ngOnInit () { 
    this.initForm();
  }

  private initForm(){
    // do something
  }
}