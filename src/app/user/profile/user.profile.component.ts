import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  PushMessageService,
  UserService
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as async from 'async'
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-profile',
  templateUrl: './user.profile.component.html',
  styleUrls: ['./user.profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  
  public userGroup: FormGroup;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private userService: UserService,
    private pushMessageService: PushMessageService,
    private fb: FormBuilder, 
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);
    this.initForm();
  }

  private initForm () {
    const that = this;
    
    this.userGroup = this.fb.group({
      uid:                              [''],
      email:                            [''],
      displayName:                      [''],
      username:                         [''],
      receivePushNotifications:         [''],
      receiveForumAlertNotifications:   [''],
      receiveServiceAlertNotifications: [''],
      receiveForumPostNotifications:    [''],
      receiveAlphaNotification:         [''],
      lastUpdateDate:                   [''],
      creationDate:                     ['']
    });

    //  ongoing subscription
    this._userSubscription = this.auth.user.subscribe(user => {
      if (user){
        this.userGroup.patchValue(user);
      }
    });

    // run once subscription
    const runOnceSubscription = this.auth.user.subscribe(user => {
      this._loading.next(false);
      runOnceSubscription.unsubscribe();
    });
  }
}