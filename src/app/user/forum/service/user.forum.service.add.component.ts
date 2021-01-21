import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  SiteTotalService,
  UserActivityService,
  UserForumRegistrantService,
  UserForumServiceBlockService,
  UserServiceForumBlockService,
  UserServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  UserForumService,
  UserServiceService,
  UserServiceImageService,
  UserForumImageService,
  UserServiceTagService,
  UserTagService,
  ServiceService,
  TagService,
  ServiceBlock,
  ServiceUserBlock,
  Registrant,
  Tag,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelect } from '@angular/material/select';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith, tap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-service-add',
  templateUrl: './user.forum.service.add.component.html',
  styleUrls: ['./user.forum.service.add.component.css']
})
export class UserForumServiceAddComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _searchServiceCtrlSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _registrantsSubscription: Subscription;
  private _registrantCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _postCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _tempServiceTags: string[] = [];
  private _numberOfItems: number = 12;
  private _registrantsArray: any[] = [];

  public forumGroup: FormGroup;
  public forum: Observable<any>;
  public nextKey: any;
  public prevKeys: any[] = [];
  public registrantCount: Observable<number> = this._registrantCount.asObservable();
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public postCount: Observable<number> = this._postCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteSearchServices: Observable<any[]>;
  public matAutoCompleteSearchServiceTags: Observable<any[]>;
  public searchServiceResults: Observable<any[]> = of([]);
  public blockTypes: string[] = ['Remove', 'Block Service', 'Block User'];
  public paymentTypes: string[] = ['Any', 'Free', 'Payment'];
  public currencies: string[] = ['AUD', 'BRL', 'GBP', 'BGN', 'CAD', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'RON', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'];
  public registrants: Observable<any[]>;
  public userServices: Observable<any[]>;
  public defaultRegistrant: any;
  public defaultForumImage: Observable<any>;
  public searchServiceCtrl: FormControl;
  public serviceSearchTagCtrl: FormControl;
  public searchServiceTags: any[] = [];
  public searchPrivateServices: boolean = true;
  public searchServiceIncludeTagsInSearch: boolean = true;
  public forumId: string;
  public userId: string;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,    
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userServiceBlockService: UserServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userTagService: UserTagService,
    private serviceService: ServiceService,
    private tagService: TagService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
      this.searchServiceCtrl = new FormControl();
      this.serviceSearchTagCtrl = new FormControl();

      this.matAutoCompleteSearchServiceTags = this.serviceSearchTagCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
  }

  addService (service) {
    if (service.title.length > 0){
      this.userForumServiceBlockService.serviceIsBlocked(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, service.serviceId)
        .then(serviceBlocked => {
          if (!serviceBlocked) {
            this.userServiceUserBlockService.userIsBlocked(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.auth.uid)
              .then(serviceUserBlock => {
                if (!serviceUserBlock) {
                  this.userServiceForumBlockService.forumIsBlocked(service.uid, service.serviceId, this.forumGroup.get('forumId').value)
                    .then(forumBlocked => {
                      if (!forumBlocked) {
                        this.userForumUserBlockService.userIsBlocked(service.uid, service.serviceId, this.forumGroup.get('uid').value)
                          .then(forumUserBlock => {
                            if (!forumUserBlock) {
                              this.userForumRegistrantService.serviceIsServingInForumFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, service.serviceId)
                                .then(isServing => {
                                  if (!isServing) {
                                    const newRegistrant: Registrant = {
                                      registrantId: '',
                                      parentId: this.defaultRegistrant ? this.defaultRegistrant.registrantId : '',
                                      serviceId: service.serviceId,
                                      uid: service.uid,
                                      forumId: this.forumGroup.get('forumId').value,
                                      forumUid: this.forumGroup.get('uid').value,
                                      default: false,
                                      creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                                      lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                                    };

                                    this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, service.serviceId)
                                      .then(registrant => {
                                        if (registrant == null)
                                          newRegistrant.default = true;

                                        this.userForumRegistrantService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, newRegistrant).then(() => {
                                          // do something
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
                                        }); 
                                      }
                                    )
                                    .catch(error => {
                                      console.error(error);
                                    });
                                  }
                                  else {
                                    const snackBarRef = this.snackbar.openFromComponent(
                                      NotificationSnackBar,
                                      {
                                        duration: 8000,
                                        data: `'${service.title}' is already serving in the forum '${this.forumGroup.get('title').value}'`,
                                        panelClass: ['red-snackbar']
                                      }
                                    );
                                  }
                                })
                                .catch((error) => {
                                  console.log("error adding service to forum " + JSON.stringify(error));
                                }
                              );
                            }
                            else {
                              const snackBarRef = this.snackbar.openFromComponent(
                                NotificationSnackBar,
                                {
                                  duration: 8000,
                                  data: `The user of the forum '${this.forumGroup.get('title').value}' has been blocked from requesting the service '${service.title}'`,
                                  panelClass: ['red-snackbar']
                                }
                              );
                            }
                          }
                        );
                      }
                      else {
                        const snackBarRef = this.snackbar.openFromComponent(
                          NotificationSnackBar,
                          {
                            duration: 8000,
                            data: `The forum '${this.forumGroup.get('title').value}' has been blocked from requesting the service '${service.title}'`,
                            panelClass: ['red-snackbar']
                          }
                        );
                      }
                    }
                  );
                }
                else {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: `The user of the service '${service.title}' has been blocked from serving in the forum '${this.forumGroup.get('title').value}'`,
                      panelClass: ['red-snackbar']
                    }
                  );
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
              }
            );
          }
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `The service '${service.title}' has been blocked from serving in the forum '${this.forumGroup.get('title').value}'`,
                panelClass: ['red-snackbar']
              }
            );
          }
        }
      );
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: `Service is missing a title`,
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  removeRegistrant (registrant) {
    this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
      this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
    })
    .catch(error => {
      console.error(error);
    });
  }

  blockRegistrant (event, registrant) {
    if (event.value == 'Remove'){
      this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
        this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
      })
      .catch(error => {
        console.error(error);
      });
    }
    else if (event.value == 'Block Service'){
      const serviceBlock: ServiceBlock = {
        serviceBlockId: '',
        serviceId: registrant.serviceId,
        serviceUid: registrant.uid,
        forumId: this.forumGroup.get('forumId').value,
        forumUid: this.forumGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userServiceBlockService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId, serviceBlock);
    }
    else { // Block User
      const userBlock: ServiceUserBlock = {
        serviceUserBlockId: '',
        userId: registrant.uid,
        serviceId: registrant.serviceId,
        forumId: this.forumGroup.get('forumId').value,
        forumUid: this.forumGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userServiceUserBlockService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.uid, userBlock);
    }
  }

  autoSearchServiceTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  autoSearchServiceDisplayFn (service: any): string {
    return service ? service.title : service;
  }

  searchServiceTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchServiceTags, function(t) { return t.tagId == tag.tagId; });
    
    if (tagIndex == -1){
      this.searchServiceTags.push(tag);
      this._tempServiceTags.push(tag.tag);
      this.searchServiceTags.sort();
      this._tempServiceTags.sort();

      if (this.forumGroup.get('searchPrivateServices').value == true){
        this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (serviceImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              serviceImages[0].url = downloadUrl;
                            else
                              serviceImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(serviceImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );
                  let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                  return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, serviceTags] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        );
      }
      else {
        this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (serviceImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              serviceImages[0].url = downloadUrl;
                            else
                              serviceImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(serviceImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );
                  let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                  return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, serviceTags] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        );
      }
    }
  }

  ngOnDestroy () {
    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._searchServiceCtrlSubscription)
      this._searchServiceCtrlSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._registrantsSubscription)
      this._registrantsSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackRegistrants (index, registrant) { return registrant.registrantId; }
  trackSearchServiceTags (index, tag) { return tag.tagId; }
  trackSearchServiceResults (index, service) { return service.serviceId; }

  ngOnInit () {
    // stick this in to fix authguard issue of reposting back to this page???
    if (this.auth.uid.length == 0){
      this.router.navigate(['/login']);
      return false;
    }
      
    const that = this;
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this.forumId = params['forumId'];
      this.userId = params['userId'];

      this._initialForumSubscription = this.userForumService.getForum(this.userId, this.forumId)
        .subscribe(forum => {
          this._initialForumSubscription.unsubscribe();

          if (forum){
            if (forum.title.length > 0){
              if (this.auth.uid == forum.uid || forum.type == 'Public'){
                this.forum = this.userForumService.getForum(this.userId, this.forumId);
                this.initForm();
              }
              else {
                // ensure user is serving in the forum before viewing it
                this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userId, this.forumId, this.auth.uid)
                  .then(registrant => {
                    if (registrant){
                      this.forum = this.userForumService.getForum(this.userId, this.forumId);
                      this.initForm();
                    }
                    else {
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: `You don't have any services serving in the forum '${forum.title}'`,
                          panelClass: ['red-snackbar']
                        }
                      );
                      this.router.navigate(['/']);
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
                  this.router.navigate(['/']);
                });
              }
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `Forum is missing a title`,
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/']);
            }
          }
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'Forum does not exist or was recently removed',
                panelClass: ['red-snackbar']
              }
            );
            this.router.navigate(['/']);
          }
        }
      );
    });
  }

  private initForm () {
    const that = this;

    this.forumGroup = this.fb.group({
      forumId:                            [''],
      parentId:                           [''],
      parentUid:                          [''],
      uid:                                [''],
      type:                               [''],
      title:                              [''],
      title_lowercase:                    [''],
      description:                        [''],
      website:                            [''],
      indexed:                            [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      searchPaymentType:                  [''],
      searchCurrency:                     [''],
      searchStartAmount:                  ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0), Validators.max(999999.99)]],
      searchEndAmount:                    ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0), Validators.max(999999.99)]],
      searchPrivateServices:              [''],
      searchServiceIncludeTagsInSearch:   [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });
    this.forumGroup.get('searchPaymentType').setValue('Any');
    this.forumGroup.get('searchCurrency').setValue('NZD');
    this.forumGroup.get('searchStartAmount').setValue(1);
    this.forumGroup.get('searchEndAmount').setValue(10);
    this.forumGroup.get('searchPrivateServices').setValue(this.searchPrivateServices);
    this.forumGroup.get('searchServiceIncludeTagsInSearch').setValue(this.searchServiceIncludeTagsInSearch);

    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum){
          this.forumGroup.patchValue(forum);

          if (this.auth.uid == forum.uid || forum.type == 'Public'){
            // ok to add service
          }
          else {
            // ensure user is serving in forum to continue viewing this page
            this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(forum.uid, forum.forumId, this.auth.uid)
              .then(registrant => {
                if (registrant){
                  this.forum = this.userForumService.getForum(this.userId, this.forumId);
                  this.initForm();
                }
                else {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: `You don't have any services serving in the forum '${forum.title}'`,
                      panelClass: ['red-snackbar']
                    }
                  );
                  this.router.navigate(['/']);
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
              this.router.navigate(['/']);
            });
          }
        }
      }
    );

    // run once subscription
    const runOnceSubscription = this.forum.subscribe(forum => {
      if (forum){
        let load = async function(){
          try {
            // get forum totals
            that._totalSubscription = that.siteTotalService.getTotal(forum.forumId)
              .subscribe(total => {
                if (total){
                  if (total.registrantCount == 0)
                    that._registrantCount.next(-1);
                  else
                    that._registrantCount.next(total.registrantCount);

                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);

                  if (total.postCount == 0)
                    that._postCount.next(-1);
                  else
                    that._postCount.next(total.postCount);

                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);

                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              }
            );

            // get the default registrant that this user is serving as in this forum
            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = registrants[0];
                else {
                  that.defaultRegistrant = null;
                }
              }
            );

            // get registrants for this forum
            that.registrants = that.userForumRegistrantService.getRegistrants(forum.uid, forum.forumId).pipe(
              switchMap(registrants => { // get the service
                if (registrants && registrants.length > 0){
                  let observables = registrants.map(registrant => {
                    let getService$ = that.userServiceService.getService(registrant.uid, registrant.serviceId).pipe(
                      switchMap(service => {
                        if (service) {
                          let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                            switchMap(serviceImages => {
                              if (serviceImages && serviceImages.length > 0){
                                let getDownloadUrl$: Observable<any>;

                                if (serviceImages[0].tinyUrl)
                                  getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());
                        
                                return combineLatest([getDownloadUrl$]).pipe(
                                  switchMap(results => {
                                    const [downloadUrl] = results;
                                    
                                    if (downloadUrl)
                                      serviceImages[0].url = downloadUrl;
                                    else
                                      serviceImages[0].url = '../../../assets/defaultTiny.jpg';
                        
                                    return of(serviceImages[0]);
                                  })
                                );
                              }
                              else return of(null);
                            })
                          );
                          
                          return combineLatest([getDefaultServiceImage$]).pipe(
                            switchMap(results => {
                              const [defaultServiceImage] = results;

                              if (defaultServiceImage)
                                service.defaultServiceImage = of(defaultServiceImage);
                              else {
                                let tempImage = {
                                  url: '../../../assets/defaultTiny.jpg'
                                };
                                service.defaultServiceImage = of(tempImage);
                              }
                              return of(service);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );

                    return combineLatest([getService$]).pipe(
                      switchMap(results => {
                        const [service] = results;
                        
                        if (service)
                          registrant.service = of(service);
                        else {
                          registrant.service = of(null);
                        }
                        return of(registrant);
                      })
                    );
                  });
                  return zip(...observables);
                }
                else return of([]);
              })
            );

            // get default forum image
            that.getDefaultForumImage();

            if (that.forumGroup.get('searchPrivateServices').value == true){
              that.matAutoCompleteSearchServices = that.searchServiceCtrl.valueChanges.pipe(
                startWith(''),
                switchMap(searchTerm => that.userServiceService.search(that.auth.uid, searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value))
              );
              
              that._searchServiceCtrlSubscription = that.searchServiceCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchServiceResults = that.userServiceService.tagSearch(that.auth.uid, searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, that.forumGroup.get('searchPaymentType').value, that.forumGroup.get('searchCurrency').value, that.forumGroup.get('searchStartAmount').value, that.forumGroup.get('searchEndAmount').value);
                })
              ).subscribe();

              // preload, service search results
              that.searchServiceResults = that.userServiceService.tagSearch(that.auth.uid, '', that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, that.forumGroup.get('searchPaymentType').value, that.forumGroup.get('searchCurrency').value, that.forumGroup.get('searchStartAmount').value, that.forumGroup.get('searchEndAmount').value).pipe(
                switchMap(services => {
                  if (services && services.length > 0) {
                    let observables = services.map(service => {
                      if (service) {
                        let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                          switchMap(serviceImages => {
                            if (serviceImages && serviceImages.length > 0){
                              let getDownloadUrl$: Observable<any>;
      
                              if (serviceImages[0].tinyUrl)
                                getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());
      
                              return combineLatest([getDownloadUrl$]).pipe(
                                switchMap(results => {
                                  const [downloadUrl] = results;
                                  
                                  if (downloadUrl)
                                    serviceImages[0].url = downloadUrl;
                                  else
                                    serviceImages[0].url = '../../../assets/defaultTiny.jpg';
                    
                                  return of(serviceImages[0]);
                                })
                              );
                            }
                            else return of(null);
                          })
                        );
                        let getServiceTags$ = that.userServiceTagService.getTags(service.uid, service.serviceId);

                        return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                          switchMap(results => {
                            const [defaultServiceImage, serviceTags] = results;

                            if (defaultServiceImage)
                              service.defaultServiceImage = of(defaultServiceImage);
                            else {
                              let tempImage = {
                                url: '../../../assets/defaultTiny.jpg'
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
                      else return of(null);
                    });

                    return zip(...observables, (...results) => {
                      return results.map((result, i) => {
                        return services[i];
                      });
                    });
                  }
                  else return of([]);
                })
              );
            }
            else {
              that.matAutoCompleteSearchServices = that.searchServiceCtrl.valueChanges.pipe(
                startWith(''),
                switchMap(searchTerm => that.serviceService.search(searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true))
              );

              that._searchServiceCtrlSubscription = that.searchServiceCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchServiceResults = that.serviceService.tagSearch(searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, that.forumGroup.get('searchPaymentType').value, that.forumGroup.get('searchCurrency').value, that.forumGroup.get('searchStartAmount').value, that.forumGroup.get('searchEndAmount').value);
                })
              ).subscribe();

              // preload, service search results
              that.searchServiceResults = that.serviceService.tagSearch('', that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, that.forumGroup.get('searchPaymentType').value, that.forumGroup.get('searchCurrency').value, that.forumGroup.get('searchStartAmount').value, that.forumGroup.get('searchEndAmount').value).pipe(
                switchMap(services => {
                  if (services && services.length > 0) {
                    let observables = services.map(service => {
                      if (service) {
                        let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                          switchMap(serviceImages => {
                            if (serviceImages && serviceImages.length > 0){
                              let getDownloadUrl$: Observable<any>;
      
                              if (serviceImages[0].tinyUrl)
                                getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());
      
                              return combineLatest([getDownloadUrl$]).pipe(
                                switchMap(results => {
                                  const [downloadUrl] = results;
                                  
                                  if (downloadUrl)
                                    serviceImages[0].url = downloadUrl;
                                  else
                                    serviceImages[0].url = '../../../assets/defaultTiny.jpg';
                    
                                  return of(serviceImages[0]);
                                })
                              );
                            }
                            else return of(null);
                          })
                        );
                        let getServiceTags$ = that.userServiceTagService.getTags(service.uid, service.serviceId);

                        return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                          switchMap(results => {
                            const [defaultServiceImage, serviceTags] = results;

                            if (defaultServiceImage)
                              service.defaultServiceImage = of(defaultServiceImage);
                            else {
                              let tempImage = {
                                url: '../../../assets/defaultTiny.jpg'
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
              );
            }
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

  searchServices () {
    if (this.forumGroup.get('searchPrivateServices').value == true){
      this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;

                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
    else {
      this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;
                    
                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
  }

  removeSearchServiceTag (tag) {
    const tagIndex = _.findIndex(this.searchServiceTags, function(t) { return t.tagId == tag.tagId; });
    
    if (tagIndex > -1) {
      this.searchServiceTags.splice(tagIndex, 1);
      this._tempServiceTags.splice(tagIndex, 1);
      this.searchServiceTags.sort();
      this._tempServiceTags.sort();

      if (this.forumGroup.get('searchPrivateServices').value == true){
        this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (serviceImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              serviceImages[0].url = downloadUrl;
                            else
                              serviceImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(serviceImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );
                  let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                  return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, serviceTags] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        );
      }
      else {
        this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (serviceImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              serviceImages[0].url = downloadUrl;
                            else
                              serviceImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(serviceImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );
                  let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                  return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, serviceTags] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        );
      }
    }
  }

  searchServiceIncludeTagsInSearchClick () {
    if (this.forumGroup.get('searchPrivateServices').value == true){
      this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;
                    
                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
    else {
      this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;
                    
                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
  }

  getDefaultForumImage () {
    this._defaultForumImageSubscription = this.userForumImageService.getDefaultForumImages(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value).pipe(
      switchMap(forumImages => {
        if (forumImages && forumImages.length > 0){
          let getDownloadUrl$: Observable<any>;

          if (forumImages[0].tinyUrl)
            getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

          return combineLatest([getDownloadUrl$]).pipe(
            switchMap(results => {
              const [downloadUrl] = results;
              
              if (downloadUrl)
                forumImages[0].url = downloadUrl;
              else
                forumImages[0].url = '../../../assets/defaultTiny.jpg';

              return of(forumImages[0]);
            })
          );
        }
        else return of(null);
      })
    )
    .subscribe(forumImage => {
      if (forumImage)
        this.defaultForumImage = of(forumImage);
      else {
        let tempImage = {
          url: '../../../assets/defaultTiny.jpg'
        };
        this.defaultForumImage = of(tempImage);
      }
    });
  }

  searchPrivateServicesClick () {
    const that = this;

    if (this.forumGroup.get('searchPrivateServices').value == true){
      this.matAutoCompleteSearchServices = this.searchServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.userServiceService.search(this.auth.uid, searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value)
        )
      );
      
      this._searchServiceCtrlSubscription = this.searchServiceCtrl.valueChanges.pipe(
        tap(searchTerm => {
          this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value);
        })
      ).subscribe();

      this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;
                    
                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
    else {
      this.matAutoCompleteSearchServices = this.searchServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.serviceService.search(searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value)
        )
      );

      this._searchServiceCtrlSubscription = this.searchServiceCtrl.valueChanges.pipe(
        tap(searchTerm => {
          this.searchServiceResults = this.serviceService.tagSearch(searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value);
        })
      ).subscribe();

      this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true, this.forumGroup.get('searchPaymentType').value, this.forumGroup.get('searchCurrency').value, this.forumGroup.get('searchStartAmount').value, this.forumGroup.get('searchEndAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                  switchMap(serviceImages => {
                    if (serviceImages && serviceImages.length > 0){
                      let getDownloadUrl$: Observable<any>;

                      if (serviceImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            serviceImages[0].url = downloadUrl;
                          else
                            serviceImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;
                    
                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
              else return of(null);
            });
      
            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      );
    }
  }
}