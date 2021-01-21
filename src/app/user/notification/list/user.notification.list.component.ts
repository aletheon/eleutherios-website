import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserNotificationService,
  UserNotificationTagService,
  TagService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-notification-list',
  templateUrl: './user.notification.list.component.html',
  styleUrls: ['./user.notification.list.component.css']
})
export class UserNotificationListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _notificationSearchSubscription: Subscription;
  private _tempSearchTags: string[] = [];

  public notificationGroup: FormGroup;
  public types: string[] = ['All', 'Forum', 'Service'];
  public searchNotificationCtrl: FormControl;
  public notificationSearchTagCtrl: FormControl;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteSearchTags: Observable<any[]>;
  public notifications: Observable<any[]> = of([]);
  public notificationsArray: any[] = [];
  public searchTags: any[] = [];
  public type: string = 'All';
  public total: Observable<number> = this._total.asObservable();
  public includeTagsInSearch: boolean;
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userNotificationTagService: UserNotificationTagService,
    private route: ActivatedRoute,
    private userNotificationService: UserNotificationService,
    private tagService: TagService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private router: Router) {
      this.searchNotificationCtrl = new FormControl();
      this.notificationSearchTagCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteSearchTags = this.notificationSearchTagCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
      
      this._notificationSearchSubscription = this.searchNotificationCtrl.valueChanges.pipe(
        startWith('')
      )
      .subscribe(searchTerm => {
        this.getNotificationsList(this.type, searchTerm);
      })
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._notificationSearchSubscription)
      this._notificationSearchSubscription.unsubscribe();
  }

  trackNotifications (index, notification) { return notification.notificationId; }
  trackSearchTags (index, tag) { return tag.tagId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      this.nextKey = null;
      this.prevKeys = [];
      this.includeTagsInSearch = true;

      this.notificationGroup = this.fb.group({
        includeTagsInSearch:  [''],
        type:                 ['']
      });
      this.notificationGroup.get('includeTagsInSearch').setValue(this.includeTagsInSearch);
      this.notificationGroup.get('type').setValue(this.type);
      this.getNotificationsList(this.type);
    });
  }

  changeType () {
    this.type = this.notificationGroup.get('type').value;
    this.getNotificationsList(this.type);
  }

  getNotificationsList (type: string, key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    // get total
    this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
      .subscribe(total => {
        if (total){
          if (type == 'All'){
            if (total.notificationCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.notificationCount);
          }
          else if (type == 'Forum'){
            if (total.forumNotificationCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.forumNotificationCount);
          }
          else {
            if (total.serviceNotificationCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.serviceNotificationCount);
          }
        }
      }
    );

    if (this.searchNotificationCtrl.value && this.searchNotificationCtrl.value.length > 0){
      if (!key)
        key = this.searchNotificationCtrl.value;

      this._subscription = this.userNotificationService.getNotificationsSearchTerm(this.type, this.auth.uid, this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch).pipe(
        switchMap(notifications => {
          if (notifications && notifications.length > 0){
            let observables = notifications.map(notification => {
              if (notification){
                let getNotificationTags$ = this.userNotificationTagService.getTags(notification.uid, notification.notificationId);
      
                return combineLatest([getNotificationTags$]).pipe(
                  switchMap(results => {
                    const [notificationTags] = results;

                    if (notificationTags)
                      notification.notificationTags = of(notificationTags);
                    else
                      notification.notificationTags = of([]);

                    return of(notification);
                  })
                );
              }
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return notifications[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(notifications => {
        this.notificationsArray = _.slice(notifications, 0, this.numberItems);
        this.notifications = of(this.notificationsArray);
        this.nextKey = _.get(this.notificationsArray[this.numberItems], 'title');
        this._loading.next(false);
      });
    }
    else {
      this._subscription = this.userNotificationService.getNotifications(this.type, this.auth.uid, this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch).pipe(
        switchMap(notifications => {
          if (notifications && notifications.length > 0){
            let observables = notifications.map(notification => {
              if (notification){
                let getNotificationTags$ = this.userNotificationTagService.getTags(notification.uid, notification.notificationId);
      
                return combineLatest([getNotificationTags$]).pipe(
                  switchMap(results => {
                    const [notificationTags] = results;

                    if (notificationTags)
                      notification.notificationTags = of(notificationTags);
                    else
                      notification.notificationTags = of([]);

                    return of(notification);
                  })
                );
              }
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return notifications[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(notifications => {
        this.notificationsArray = _.slice(notifications, 0, this.numberItems);
        this.notifications = of(this.notificationsArray);
        this.nextKey = _.get(notifications[this.numberItems], 'creationDate');
        this._loading.next(false);
      });
    }
  }

  includeTagsInSearchClick () {
    this.includeTagsInSearch = this.notificationGroup.get('includeTagsInSearch').value;
    this.getNotificationsList(this.type);
  }

  removeSearchTag (tag) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });
    
    // tag exists so remove it
    if (tagIndex > -1) {
      this.searchTags.splice(tagIndex, 1);
      this.searchTags.sort();
      this._tempSearchTags.splice(tagIndex, 1);
      this.getNotificationsList(this.type);
    }
  }

  autoSearchTagDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  searchTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });
    
    // tag doesn't exist so add it
    if (tagIndex == -1){
      this.searchTags.push(tag);
      this._tempSearchTags.push(tag.tag);
      this.searchTags.sort();
      this._tempSearchTags.sort();
      this.getNotificationsList(this.type);
    }
  }

  delete (notification) {
    this.userNotificationService.delete(this.auth.uid, notification.notificationId);
  }

  edit (notification) {
    this.router.navigate(['/user/notification/edit'], { queryParams: { userId: notification.uid, notificationId: notification.notificationId } });
  }

  activateDeactivateNotification (notification){
    this.userNotificationService.getNotificationFromPromise(notification.uid, notification.notificationId)
      .then(fetchedNotification => {
        if (fetchedNotification){
          fetchedNotification.active = !fetchedNotification.active;
          this.userNotificationService.update(fetchedNotification.uid, fetchedNotification.notificationId, fetchedNotification);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Notification with notificationId ${notification.notificationId} does not exist or was removed`,
              panelClass: ['red-snackbar']
            }
          );
        }
      }
    )
    .catch(error => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: error.message,
          panelClass: ['red-snackbar']
        }
      );
    });
  }

  onNext () {
    if (this.searchNotificationCtrl.value && this.searchNotificationCtrl.value.length > 0)
      this.prevKeys.push(_.first(this.notificationsArray)['title']);
    else
      this.prevKeys.push(_.first(this.notificationsArray)['creationDate']);

    this.getNotificationsList(this.type, this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getNotificationsList(this.type, prevKey);
  }
}