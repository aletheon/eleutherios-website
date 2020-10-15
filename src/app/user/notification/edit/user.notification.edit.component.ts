import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  SiteTotalService,
  UserNotificationService,
  UserNotificationTagService,
  UserForumImageService,
  UserServiceImageService,
  UserForumRegistrantService,
  UserTagService,
  UserServiceTagService,
  UserForumTagService,
  ForumService,
  ServiceService,
  TagService,
  Notification,
  Tag,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import * as firebase from 'firebase/app';
import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-notification-edit',
  templateUrl: './user.notification.edit.component.html',
  styleUrls: ['./user.notification.edit.component.css']
})
export class UserNotificationEditComponent implements OnInit, OnDestroy, AfterViewInit  {
  @ViewChild('main', { static: true }) titleRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _notificationSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _notificationTagSubscription: Subscription;
  private _searchSubscription: Subscription;
  private _searchCtrlSubscription: Subscription;
  private _tempNotificationTags: any[] = [];
  private _tagCount = new BehaviorSubject(0);
  private _alertCount = new BehaviorSubject(0);
  private _addingTag = new BehaviorSubject(false);

  public notification: Observable<any>;
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public alertCount: Observable<number> = this._alertCount.asObservable();
  public notificationGroup: FormGroup;
  public numberOfItems: number = 12; 
  public nextKey: any;
  public prevKeys: any[] = [];
  public types: string[] = ['Service', 'Forum'];
  public notificationTags: Observable<any[]>;
  public matAutoCompleteSearch: Observable<any[]>;
  public matAutoCompleteSearchTags: Observable<any[]>;
  public matAutoCompleteTags: Observable<any[]>;
  public searchTags: Observable<any[]> = of([]);
  public searchResults: Observable<any[]> = of([]);
  public searchResultsArray: any[] = [];
  public searchTagCtrl: FormControl;
  public tagSearchCtrl: FormControl;
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();
  
  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userNotificationTagService: UserNotificationTagService,
    private userNotificationService: UserNotificationService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumRegistrantService: UserForumRegistrantService,
    private forumService: ForumService,
    private serviceService: ServiceService,
    private userTagService: UserTagService,
    private userServiceTagService: UserServiceTagService,
    private userForumTagService: UserForumTagService,
    private tagService: TagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
      this.searchTagCtrl = new FormControl();
      this.tagSearchCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteSearchTags = this.searchTagCtrl.valueChanges.pipe(
        startWith([null]),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
      
      // tagSearch mat subscription
      this.matAutoCompleteTags = this.tagSearchCtrl.valueChanges.pipe(
        startWith([null]),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
  }

  removeTag (tag) {
    this.userNotificationTagService.exists(this.notificationGroup.get('uid').value, this.notificationGroup.get('notificationId').value, tag.tagId).then(exists => {
      if (exists)
        this.userNotificationTagService.delete(this.notificationGroup.get('uid').value, this.notificationGroup.get('notificationId').value, tag.tagId);
    });
  }

  autoTagDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  tagSearchSelectionChange (tag: any) {
    if (this.notificationGroup.get('title').value.length > 0){
      this.userNotificationTagService.exists(this.notificationGroup.get('uid').value, this.notificationGroup.get('notificationId').value, tag.tagId).then(exists => {
        if (!exists){
          this.userNotificationTagService.getTagCount(this.notificationGroup.get('uid').value, this.notificationGroup.get('notificationId').value).then(count => {
            if (count < 5){
              if (this._addingTag.getValue() == false){
                this._addingTag.next(true);
  
                this.userNotificationTagService.create(this.notificationGroup.get('uid').value, this.notificationGroup.get('notificationId').value, tag)
                  .then(() => {
                    // delay to prevent user adding multiple tags simultaneously
                    setTimeout(() => {
                      this._addingTag.next(false);
                    }, 1000);
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
            }
            else {
              const snackBarRef =this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'This is the alpha version of eleutherios and is limited to only 5 tags each notification',
                  panelClass: ['red-snackbar']
                }
              );
            }
          });
        }
      });
    }
  }

  ngOnDestroy () {
    if (this._notificationSubscription)
      this._notificationSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._notificationTagSubscription)
      this._notificationTagSubscription.unsubscribe();

    if (this._searchCtrlSubscription)
      this._searchCtrlSubscription.unsubscribe();
  }

  trackNotificationTags (index, tag) { return tag.tagId; }
  trackResults (index, result) { return (result.forumId ? result.forumId : result.serviceId) }

  ngAfterViewInit () {
    const that = this;

    let intervalId = setInterval(() => {
      if (that._loading.getValue() == false && that._searchLoading.getValue() == false) {
        clearInterval(intervalId);

        if (that.notificationGroup.get('title') && that.notificationGroup.get('title').value.length == 0){
          // set focus
          for (let i in that.notificationGroup.controls) {
            that.notificationGroup.controls[i].markAsTouched();
          }
          that.titleRef.nativeElement.focus();
        }
      }
    }, 500);
  }
  
  ngOnInit () {
    const that = this;
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this.userNotificationService.exists(this.auth.uid, params['notificationId']).then(exists => {
        if (exists){
          this.notification = this.userNotificationService.getNotification(this.auth.uid, params['notificationId']);
          this.initForm();
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Notification does not exist or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/user/notification/list']);
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
    this.notificationGroup = this.fb.group({
      notificationId:                 [''],
      uid:                            [''],
      type:                           [''],
      title:                          ['', Validators.required ],
      active:                         [''],
      lastUpdateDate:                 [''],
      creationDate:                   ['']
    });

    //  ongoing subscription
    this._notificationSubscription = this.notification
      .subscribe(notification => {
        if (notification){
          this.notificationGroup.patchValue(notification);
  
          if (notification.title.length == 0)
            that.notificationGroup.get('active').disable();
          else
            that.notificationGroup.get('active').enable();
        } 
      }
    );

    // run once subscription
    const runOnceSubscription = this.notification.subscribe(notification => {
      if (notification){
        let load = async function(){
          try {
            // notification totals
            that._totalSubscription = that.siteTotalService.getTotal(notification.notificationId)
              .subscribe(total => {
                if (total) {
                  if (total.alertCount == 0)
                    that._alertCount.next(-1);
                  else
                    that._alertCount.next(total.alertCount);
                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);
                }
              }
            );

            // notification tags
            that._notificationTagSubscription = that.userNotificationTagService.getTags(notification.uid, notification.notificationId)
              .subscribe(notificationTags => {
                that._tempNotificationTags = [];

                if (notificationTags && notificationTags.length > 0) {
                  notificationTags.forEach(notificationTag => {
                    that._tempNotificationTags.push(notificationTag.tag);
                  });
                  that.notificationTags = of(notificationTags);
                }
                else that.notificationTags = of([]);

                // do search
                that.getSearchList();
              }
            );
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
          console.log('initForm error ' + error);
        });
      }
    });
  }

  getSearchList (key?: any) {
    if (this._searchSubscription)
      this._searchSubscription.unsubscribe();

    // loading
    this._searchLoading.next(true);

    if (this.notificationGroup.get('type').value == 'Forum') {
      this._searchSubscription = this.forumService.getForums(this.numberOfItems, key, this._tempNotificationTags, this._tempNotificationTags.length > 0 ? true : false, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0) {
            let observables = forums.map(forum => {
              if (forum) {
                let getDefaultForumImages$ = this.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId);
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
                let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.auth.uid).pipe(
                  switchMap(registrants => {
                    if (registrants && registrants.length > 0)
                      return of(registrants[0]);
                    else
                      return of(null);
                  })
                );

                return combineLatest([getDefaultForumImages$, getForumTags$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImages, forumTags, defaultRegistrant] = results;

                    if (defaultForumImages && defaultForumImages.length > 0)
                      forum.defaultForumImage = of(defaultForumImages[0]);
                    else {
                      let tempImage = {
                        smallUrl: '../../../assets/defaultThumbnail.jpg',
                        name: 'No image'
                      };
                      forum.defaultForumImage = of(tempImage);
                    }

                    if (forumTags)
                      forum.forumTags = of(forumTags);
                    else
                      forum.forumTags = of([]);

                    if (defaultRegistrant)
                      forum.defaultRegistrant = of(defaultRegistrant);
                    else
                      forum.defaultRegistrant = of(null);

                    return of(forum);
                  })
                );
              }
              else
                return of(null);
            });

            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return forums[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(forums => {
        this.searchResultsArray = _.slice(forums, 0, this.numberOfItems);
        this.searchResults = of(this.searchResultsArray);
        this.nextKey = _.get(forums[this.numberOfItems], 'creationDate');
        this._searchLoading.next(false);
      });
    }
    else {
      this._searchSubscription = this.serviceService.getServices(this.numberOfItems, key, this._tempNotificationTags, this._tempNotificationTags.length > 0 ? true : false, true).pipe(
        switchMap(services => {
          if (services && services.length > 0) {
            let observables = services.map(service => {
              if (service) {
                let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImages$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImages, serviceTags] = results;

                    if (defaultServiceImages && defaultServiceImages.length > 0)
                      service.defaultServiceImage = of(defaultServiceImages[0]);
                    else {
                      let tempImage = {
                        smallUrl: '../../../assets/defaultThumbnail.jpg',
                        name: 'No image'
                      };
                      service.defaultServiceImage = of(tempImage);
                    }

                    if (serviceTags)
                      service.serviceTags = of(serviceTags);
                    else
                      service.serviceTags = of([]);
                      
                    return of(service);
                  })
                );
              }
              else
                return of(null);
            });

            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(services => {
        this.searchResultsArray = _.slice(services, 0, this.numberOfItems);
        this.searchResults = of(this.searchResultsArray);
        this.nextKey = _.get(services[this.numberOfItems], 'creationDate');
        this._searchLoading.next(false);
      });
    }
  }

  createTagSearchTag () {
    if (this.tagSearchCtrl.value.length > 0){
      let valueToSearch = this.tagSearchCtrl.value.replace(/\s\s+/g,' ').toLowerCase();

      if (valueToSearch.length > 0){
        if (valueToSearch.length <= 50){
          if (/^[A-Za-z0-9\s]*$/.test(valueToSearch)){
            this.tagService.exists(valueToSearch).then(result => {
              if (!result){
                const newTag: Tag = {
                  tagId: '',
                  uid: this.auth.uid,
                  tag: valueToSearch,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                  creationDate: firebase.firestore.FieldValue.serverTimestamp()
                };
      
                const userTag = this.userTagService.create(this.auth.uid, newTag).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: `Created new tag '${valueToSearch}'`,
                      panelClass: ['green-snackbar']
                    }
                  );
                });
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `The tag '${valueToSearch}' already exists`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            });
          }
          else {
            const snackBarRef =this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `Invalid characters we're located in the tag field, valid characters include [A-Za-z0-9]`,
                panelClass: ['red-snackbar']
              }
            );
          }
        }
        else {
          const snackBarRef =this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'This is the alpha version of eleutherios and is limited to only 50 characters per tag',
              panelClass: ['red-snackbar']
            }
          );
        }
      }
    }
  }

  changeType () {
    this.getSearchList();
    this.saveChanges();
  }

  saveChanges () {
    if (this.notificationGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');
      return;
    }

    let tempTitle = this.notificationGroup.get('title').value.replace(/\s\s+/g,' ');

    if (tempTitle.length <= 100){
      if (/^[A-Za-z0-9\s]*$/.test(tempTitle)){
        const notification: Notification = {
          notificationId: this.notificationGroup.value.notificationId,
          uid: this.notificationGroup.value.uid,
          type: this.notificationGroup.value.type,
          title: tempTitle,
          title_lowercase: tempTitle.toLowerCase(),
          active: this.notificationGroup.value.active != undefined ? this.notificationGroup.value.active : false,
          lastUpdateDate: this.notificationGroup.value.lastUpdateDate,
          creationDate: this.notificationGroup.value.creationDate
        };
        
        this.userNotificationService.update(this.auth.uid, notification.notificationId, notification).then(() => {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 5000,
              data: 'Notification saved',
              panelClass: ['green-snackbar']
            }
          );
        });
      }
      else {
        const snackBarRef =this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: `Invalid characters we're located in the title field, valid characters include [A-Za-z0-9]`,
            panelClass: ['red-snackbar']
          }
        );
      }
    }
    else {
      const snackBarRef =this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: 'This is the alpha version of eleutherios and is limited to only 100 characters per title',
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  onNext () {
    this.prevKeys.push(_.first(this.searchResultsArray)['creationDate']);
    this.getSearchList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getSearchList(prevKey);
  }
}