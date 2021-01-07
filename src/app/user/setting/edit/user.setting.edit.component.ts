import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  PushMessageService,
  UserService
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as async from 'async'
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-setting-edit',
  templateUrl: './user.setting.edit.component.html',
  styleUrls: ['./user.setting.edit.component.css']
})
export class UserSettingEditComponent implements OnInit, OnDestroy {
  @ViewChild('displayNameRef', { static: false }) displayNameRef: ElementRef;
  @ViewChild('usernameRef', { static: false }) usernameRef: ElementRef;
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

  // 1) give end users ability to change username
  // 2) clean up subscriptions so they are unsubscribed from properly

  pushNotificationSave () {
    const that = this;

    async.series([
      function(callback) {
        if (that.userGroup.get('receivePushNotifications').value == true){
          that.userGroup.get('receiveForumAlertNotifications').setValue(true);
          that.userGroup.get('receiveServiceAlertNotifications').setValue(true);
          that.userGroup.get('receiveForumPostNotifications').setValue(true);
        }
        else {
          that.userGroup.get('receiveForumAlertNotifications').setValue(false);
          that.userGroup.get('receiveServiceAlertNotifications').setValue(false);
          that.userGroup.get('receiveForumPostNotifications').setValue(false);
        }
        that.saveChanges();
        callback(null, null);
      },
      function(callback) {
        setTimeout(() => {
          that.checkPushNotificationPermission();
          callback(null, null);
        }, 1000);
      }
    ]);
  }

  updateAccount(){
    // Use the function name from Firebase
    var updateAccount = firebase.functions().httpsCallable('updateAccount');
    updateAccount().then((result) => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 5000,
          data: 'Settings saved',
          panelClass: ['green-snackbar']
        }
      );
    })
    .catch(error => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 12000,
          data: error.message,
          panelClass: ['red-snackbar']
        }
      );
    });
  }

  checkPushNotificationPermission () {
    if (this.userGroup.get('receivePushNotifications').value == true)
      this.pushMessageService.getPermission(this.auth.uid);
  }

  delete () {
    const snackBarRef = this.snackbar.openFromComponent(
      NotificationSnackBar,
      {
        duration: 12000,
        data: 'This is the alpha version of Eleutherios.  All data collected, including user profiles, will be purged after the alpha trial period.',
        panelClass: ['red-snackbar']
      }
    );
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
      displayName:                      ['', [Validators.required, Validators.pattern(/^(?=[a-zA-Z0-9._]{3,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/)]],
      username:                         ['', [Validators.required, Validators.pattern(/^(?=[a-zA-Z0-9._]{6,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/)]],
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

        if (user.receivePushNotifications == false){
          this.userGroup.get('receiveForumAlertNotifications').disable();
          this.userGroup.get('receiveServiceAlertNotifications').disable();
          this.userGroup.get('receiveForumPostNotifications').disable();
        }
        else {
          this.userGroup.get('receiveForumAlertNotifications').enable();
          this.userGroup.get('receiveServiceAlertNotifications').enable();
          this.userGroup.get('receiveForumPostNotifications').enable();
        }
      }
    });

    // run once subscription
    const runOnceSubscription = this.auth.user
      .subscribe(user => {
        this._loading.next(false);
        runOnceSubscription.unsubscribe();
      }
    );
  }

  saveChanges () {
    if (this.userGroup.status != 'VALID') {
      if (this.userGroup.get('displayName').hasError('required')) {
        setTimeout(() => {
          for (let i in this.userGroup.controls) {
            this.userGroup.controls[i].markAsTouched();
          }
          this.displayNameRef.nativeElement.focus();
        }, 500);
        return;
      }
      else if (this.userGroup.get('displayName').hasError('pattern')){
        setTimeout(() => {
          for (let i in this.userGroup.controls) {
            this.userGroup.controls[i].markAsTouched();
          }
          this.displayNameRef.nativeElement.focus();
        }, 500);
        return;
      }
      else if (this.userGroup.get('username').hasError('required')) {
        setTimeout(() => {
          for (let i in this.userGroup.controls) {
            this.userGroup.controls[i].markAsTouched();
          }
          this.usernameRef.nativeElement.focus();
        }, 500);
        return;
      }
      else if (this.userGroup.get('username').hasError('pattern')){
        setTimeout(() => {
          for (let i in this.userGroup.controls) {
            this.userGroup.controls[i].markAsTouched();
          }
          this.usernameRef.nativeElement.focus();
        }, 500);
        return;
      }
    }
  
    const data = {
      uid: this.userGroup.get('uid').value,
      email: this.userGroup.get('email').value,
      displayName: this.userGroup.get('displayName').value,
      username: this.userGroup.get('username').value,
      receivePushNotifications: this.userGroup.get('receivePushNotifications').value,
      receiveForumAlertNotifications: this.userGroup.get('receiveForumAlertNotifications').value,
      receiveServiceAlertNotifications: this.userGroup.get('receiveServiceAlertNotifications').value,
      receiveForumPostNotifications: this.userGroup.get('receiveForumPostNotifications').value,
      receiveAlphaNotification: this.userGroup.get('receiveAlphaNotification').value,
      lastUpdateDate: this.userGroup.get('lastUpdateDate').value,
      creationDate: this.userGroup.get('creationDate').value
    }
  
    this.userService.update(this.auth.uid, data).then(() => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 5000,
          data: 'Settings saved',
          panelClass: ['green-snackbar']
        }
      );
    });
  }
}