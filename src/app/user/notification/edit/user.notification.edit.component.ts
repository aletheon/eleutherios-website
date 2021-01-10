import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
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
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

// custom validator to ensure start amount is less than end amount
// if end user wants to be notified about paid for services.
const rangeValidator: ValidatorFn = (control: FormGroup): ValidationErrors | null => {
  const start = control.get('startAmount').value;
  const end = control.get('endAmount').value;
  return (start !== null && end !== null) && (start < end ? null : { range: true });
};

@Component({
  selector: 'user-notification-edit',
  templateUrl: './user.notification.edit.component.html',
  styleUrls: ['./user.notification.edit.component.css']
})
export class UserNotificationEditComponent implements OnInit, OnDestroy, AfterViewInit  {
  @ViewChild('main', { static: false }) titleRef: ElementRef;
  @ViewChild('startAmount', { static: false }) startAmountRef: ElementRef;
  @ViewChild('endAmount', { static: false }) endAmountRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _initialNotificationSubscription: Subscription;
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
  public paymentTypes: string[] = ['Free', 'Payment'];
  public currencies: string[] = ['AUD', 'BRL', 'GBP', 'BGN', 'CAD', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'RON', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'];
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
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
      
      // tagSearch mat subscription
      this.matAutoCompleteTags = this.tagSearchCtrl.valueChanges.pipe(
        startWith(''),
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
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._initialNotificationSubscription = this.userNotificationService.getNotification(this.auth.uid, params['notificationId']).subscribe(notification => {
        this._initialNotificationSubscription.unsubscribe();

        if (notification){
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
      });
    });
  }

  private initForm () {
    const that = this;
    this.notificationGroup = this.fb.group({
      notificationId:                 [''],
      uid:                            [''],
      type:                           [''],
      title:                          ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9\s]*$/)]],
      active:                         [''],
      paymentType:                    [''],
      currency:                       [''],
      startAmount:                    ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0.50), Validators.max(999999.99)]],
      endAmount:                      ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0), Validators.max(999999.99)]],
      lastUpdateDate:                 [''],
      creationDate:                   ['']
    }, { validators: rangeValidator });

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
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
                let getDefaultForumImage$ = this.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                  switchMap(forumImages => {
                    if (forumImages && forumImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (forumImages[0].smallUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].smallUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            forumImages[0].url = downloadUrl;
                          else
                            forumImages[0].url = '../../../assets/defaultThumbnail.jpg';
            
                          return of(forumImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultForumImage$, getForumTags$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, forumTags] = results;

                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultThumbnail.jpg'
                      };
                      forum.defaultForumImage = of(tempImage);
                    }

                    if (forumTags)
                      forum.forumTags = of(forumTags);
                    else
                      forum.forumTags = of([]);

                    return of(forum);
                  })
                );
              }
              else return of(null);
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
      this._searchSubscription = this.serviceService.getServices(this.numberOfItems, key, this._tempNotificationTags, this._tempNotificationTags.length > 0 ? true : false, true, this.notificationGroup.get('paymentType').value, this.notificationGroup.get('currency').value, this.notificationGroup.get('startAmount').value, this.notificationGroup.get('endAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0) {
            let observables = services.map(service => {
              if (service) {
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].smallUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].smallUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultThumbnail.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;

                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultThumbnail.jpg'
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
                  // add tag to search list
                  this.tagService.search(newTag.tag).subscribe(tags => {
                    this.tagSearchSelectionChange(tags[0]);
                  });

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
                data: `Invalid characters we're found in the tag field, valid characters include [A-Za-z0-9]`,
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
      if (this.notificationGroup.get('title').hasError('required') || this.notificationGroup.get('title').hasError('pattern')) {
        setTimeout(() => {
          for (let i in this.notificationGroup.controls) {
            this.notificationGroup.controls[i].markAsTouched();
          }
          this.titleRef.nativeElement.focus();
        }, 500);
        return;
      }
  
      if (this.notificationGroup.get('type').value == 'Service'){
        if (this.notificationGroup.get('paymentType').value == 'Payment'){
          if (this.notificationGroup.get('startAmount').hasError('pattern') || this.notificationGroup.get('startAmount').hasError('min') || this.notificationGroup.get('startAmount').hasError('max')){
            setTimeout(() => {
              for (let i in this.notificationGroup.controls) {
                this.notificationGroup.controls[i].markAsTouched();
              }
              if (this.startAmountRef) this.startAmountRef.nativeElement.focus();
            }, 500);
            return;
          }
  
          if (this.notificationGroup.get('endAmount').hasError('pattern') || this.notificationGroup.get('endAmount').hasError('min') || this.notificationGroup.get('endAmount').hasError('max')){
            setTimeout(() => {
              for (let i in this.notificationGroup.controls) {
                this.notificationGroup.controls[i].markAsTouched();
              }
              if (this.endAmountRef) this.endAmountRef.nativeElement.focus();
            }, 500);
            return;
          }
  
          if (this.notificationGroup.get('endAmount').hasError('pattern') || this.notificationGroup.get('endAmount').hasError('min') || this.notificationGroup.get('endAmount').hasError('max')){
            setTimeout(() => {
              for (let i in this.notificationGroup.controls) {
                this.notificationGroup.controls[i].markAsTouched();
              }
              if (this.endAmountRef) this.endAmountRef.nativeElement.focus();
            }, 500);
            return;
          }
  
          if (this.notificationGroup.get('endAmount').hasError('pattern') || this.notificationGroup.get('endAmount').hasError('min') || this.notificationGroup.get('endAmount').hasError('max')){
            setTimeout(() => {
              for (let i in this.notificationGroup.controls) {
                this.notificationGroup.controls[i].markAsTouched();
              }
              if (this.endAmountRef) this.endAmountRef.nativeElement.focus();
            }, 500);
            return;
          }
  
          if (this.notificationGroup.errors?.range){
            setTimeout(() => {
              for (let i in this.notificationGroup.controls) {
                this.notificationGroup.controls[i].markAsTouched();
              }
              if (this.startAmountRef) this.startAmountRef.nativeElement.focus();
            }, 500);
            return;
          }
        }
      } 
    }

    // refresh search list
    this.getSearchList();
    let tempTitle = this.notificationGroup.get('title').value.replace(/\s\s+/g,' ');

    if (tempTitle.length <= 100){
      const notification: Notification = {
        notificationId: this.notificationGroup.get('notificationId').value,
        uid: this.notificationGroup.get('uid').value,
        type: this.notificationGroup.get('type').value,
        title: tempTitle,
        title_lowercase: tempTitle.toLowerCase(),
        active: this.notificationGroup.get('active').value != undefined ? this.notificationGroup.get('active').value : false,
        paymentType: this.notificationGroup.get('type').value == 'Service' ? this.notificationGroup.get('paymentType').value : 'Free',
        currency: this.notificationGroup.get('type').value == 'Service' ? this.notificationGroup.get('currency').value : '',
        startAmount: (this.notificationGroup.get('type').value == 'Service' && this.notificationGroup.get('paymentType').value == 'Payment') ? _.ceil(this.notificationGroup.get('startAmount').value, 2) : 1.00,
        endAmount: (this.notificationGroup.get('type').value == 'Service' && this.notificationGroup.get('paymentType').value == 'Payment') ? _.ceil(this.notificationGroup.get('endAmount').value, 2) : 10.00,
        lastUpdateDate: this.notificationGroup.get('lastUpdateDate').value,
        creationDate: this.notificationGroup.get('creationDate').value,
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