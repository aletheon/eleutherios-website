import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  PushMessageService,
  UserService
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as async from 'async'

@Component({
  selector: 'user-setting-edit',
  templateUrl: './user.setting.edit.component.html',
  styleUrls: ['./user.setting.edit.component.css']
})
export class UserSettingEditComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _activityCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _serviceCount = new BehaviorSubject(0);
  private _notificationCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _forumNotificationCount = new BehaviorSubject(0);
  private _serviceNotificationCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _alertCount = new BehaviorSubject(0);
  private _forumBlockCount = new BehaviorSubject(0);
  private _serviceBlockCount = new BehaviorSubject(0);
  private _forumUserBlockCount = new BehaviorSubject(0);
  private _serviceUserBlockCount = new BehaviorSubject(0);

  public user: Observable<any>;
  public activityCount: Observable<number> = this._activityCount.asObservable();
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public serviceCount: Observable<number> = this._serviceCount.asObservable();
  public notificationCount: Observable<number> = this._notificationCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public forumNotificationCount: Observable<number> = this._forumNotificationCount.asObservable();
  public serviceNotificationCount: Observable<number> = this._serviceNotificationCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public alertCount: Observable<number> = this._alertCount.asObservable();
  public forumBlockCount: Observable<number> = this._forumBlockCount.asObservable();
  public serviceBlockCount: Observable<number> = this._serviceBlockCount.asObservable();
  public forumUserBlockCount: Observable<number> = this._forumUserBlockCount.asObservable();
  public serviceUserBlockCount: Observable<number> = this._serviceUserBlockCount.asObservable();
  public userGroup: FormGroup;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(private auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userService: UserService,
    private pushMessageService: PushMessageService,
    private fb: FormBuilder, 
    private route: ActivatedRoute,
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  pushNotificationSave () {
    const that = this;

    async.series([
      function(callback) {
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

  checkPushNotificationPermission () {
    if (this.userGroup.get('receivePushNotifications').value == true)
      this.pushMessageService.getPermission(this.auth.uid);
  }

  saveChanges () {
    if (this.userGroup.status != 'VALID') {
      console.log('user is not valid, cannot save to database');
      return;
    }
  
    const data = {
      uid: this.userGroup.get('uid').value,
      email: this.userGroup.get('email').value,
      displayName: this.userGroup.get('displayName').value,
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

  stripeConnect () {
    this.userService.onboardCustomer(this.auth.uid).then(data => {
      window.location.href = data.url;
    })
    .catch(error => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 12000,
          data: error.error,
          panelClass: ['red-snackbar']
        }
      );
      console.log('error message ' + JSON.stringify(error));
    })
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this.userService.exists(this.auth.uid).then(exists => {
        if (exists){
          this.user = this.userService.getUser(this.auth.uid);
          this.initForm();
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'User does not exist or you do not have permission to edit this users settigs',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      })
      .catch(error => {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: error.message,
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/']);
      });
    });
  }

  private initForm () {
    const that = this;
    
    this.userGroup = this.fb.group({
      uid:                              [''],
      email:                            [''],
      displayName:                      [''],
      receivePushNotifications:         [''],
      receiveForumAlertNotifications:   [''],
      receiveServiceAlertNotifications: [''],
      receiveForumPostNotifications:    [''],
      receiveAlphaNotification:         [''],
      lastUpdateDate:                   [''],
      creationDate:                     ['']
    });

    //  ongoing subscription
    this._userSubscription = this.user.subscribe(user => {
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
    const runOnceSubscription = this.user.subscribe(user => {
      if (user){
        let load = async function(){
          try {
            // service totals
            that._totalSubscription = that.siteTotalService.getTotal(user.uid)
              .subscribe(total => {
                if (total) {
                  if (total.activityCount == 0)
                    that._activityCount.next(-1);
                  else
                    that._activityCount.next(total.activityCount);
                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);
                  if (total.serviceCount == 0)
                    that._serviceCount.next(-1);
                  else
                    that._serviceCount.next(total.serviceCount);
                  if (total.notificationCount == 0)
                    that._notificationCount.next(-1);
                  else
                    that._notificationCount.next(total.notificationCount);
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                  if (total.forumNotificationCount == 0)
                    that._forumNotificationCount.next(-1);
                  else
                    that._forumNotificationCount.next(total.forumNotificationCount);
                  if (total.serviceNotificationCount == 0)
                    that._serviceNotificationCount.next(-1);
                  else
                    that._serviceNotificationCount.next(total.serviceNotificationCount);
                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);
                  if (total.alertCount == 0)
                    that._alertCount.next(-1);
                  else
                    that._alertCount.next(total.alertCount);
                  if (total.forumBlockCount == 0)
                    that._forumBlockCount.next(-1);
                  else
                    that._forumBlockCount.next(total.forumBlockCount);
                  if (total.serviceBlockCount == 0)
                    that._serviceBlockCount.next(-1);
                  else
                    that._serviceBlockCount.next(total.serviceBlockCount);
                  if (total.forumUserBlockCount == 0)
                    that._forumUserBlockCount.next(-1);
                  else
                    that._forumUserBlockCount.next(total.forumUserBlockCount);
                  if (total.serviceUserBlockCount == 0)
                    that._serviceUserBlockCount.next(-1);
                  else
                    that._serviceUserBlockCount.next(total.serviceUserBlockCount);
                }
              });
          }
          catch (error) {
            throw error;
          }
        }
    
        // call load
        load().then(() => {
          this._loading.next(false);
          runOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }
}