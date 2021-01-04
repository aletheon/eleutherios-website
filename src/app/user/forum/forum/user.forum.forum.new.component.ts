import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  SiteTotalService,
  UserForumService,
  UserForumTagService,
  UserForumImageService,
  UserServiceBlockService,
  UserForumServiceBlockService,
  UserServiceForumBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  UserActivityService,
  UserForumRegistrantService,
  UserServiceService,
  UserTagService,
  UserForumForumService,
  UserServiceImageService,
  UserImageService,
  ServiceService,
  TagService,
  Forum,
  Registrant,
  ServiceBlock,
  ServiceUserBlock,
  Tag,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelect } from '@angular/material/select';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, from, combineLatest, zip, timer, defer, throwError } from 'rxjs';
import { switchMap, startWith, tap, retryWhen, catchError, mergeMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-forum-new',
  templateUrl: './user.forum.forum.new.component.html',
  styleUrls: ['./user.forum.forum.new.component.css']
})
export class UserForumForumNewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('main', { static: false }) titleRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _initialForumSubscription: Subscription;
  private _parentForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _searchServiceCtrlSubscription: Subscription;
  private _registrantCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _postCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _tempServiceTags: string[] = [];
  private _settingDefaultForumImage: boolean = false;
  private _addingTag = new BehaviorSubject(false);
  private _tempForum: any;

  public forumGroup: FormGroup;
  public parentForum: Observable<any>;
  public forum: Observable<any>;
  public registrantCount: Observable<number> = this._registrantCount.asObservable();
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public postCount: Observable<number> = this._postCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public loading: Observable<boolean> = this._loading.asObservable();
  public types: string[] = ['Public', 'Private'];
  public registrants: Observable<any[]>;
  public blockTypes: string[] = ['Remove', 'Block Service', 'Block User'];
  public forumTags: Observable<any[]>;
  public forumImages: Observable<any[]>;
  public images: Observable<any[]>;
  public matAutoCompleteSearchServices: Observable<any[]>;
  public matAutoCompleteSearchServiceTags: Observable<any[]>;
  public matAutoCompleteForumTags: Observable<any[]>;
  public searchServiceResults: Observable<any[]> = of([]);
  public searchServiceCtrl: FormControl;
  public serviceSearchTagCtrl: FormControl;
  public tagForumCtrl: FormControl;
  public searchServiceTags: any[] = [];
  public searchServiceIncludeTagsInSearch: boolean = true;
  public searchPrivateServices: boolean = true;
  public parentForumId: string;
  public parentForumUserId: string;
  public defaultRegistrant: any;
  public defaultForumImage: Observable<any>;

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumTagService: UserForumTagService,
    private userForumImageService: UserForumImageService,
    private userServiceBlockService: UserServiceBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userForumRegistrantService: UserForumRegistrantService, 
    private userForumForumService: UserForumForumService,
    private userTagService: UserTagService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userImageService: UserImageService,
    private serviceService: ServiceService,
    private tagService: TagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
      this.searchServiceCtrl = new FormControl();
      this.serviceSearchTagCtrl = new FormControl();
      this.tagForumCtrl = new FormControl();

      this.matAutoCompleteSearchServiceTags = this.serviceSearchTagCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
      
      this.matAutoCompleteForumTags = this.tagForumCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
  }

  ngOnDestroy () {
    if (this._parentForumSubscription)
      this._parentForumSubscription.unsubscribe();

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._searchServiceCtrlSubscription)
      this._searchServiceCtrlSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }
  
  trackForumTags (index, forumTag) { return forumTag.tagId; }
  trackForumImages (index, forumImage) { return forumImage.forumImageId; }
  trackImages (index, image) { return image.imageId; }
  trackRegistrants (index, registrant) { return registrant.registrantId; }
  trackSearchServiceTags (index, tag) { return tag.tagId; }
  trackSearchServiceResults (index, service) { return service.serviceId; }

  ngAfterViewInit () {
    // const that = this;
    // let intervalId = setInterval(function() {
    //   if(that._loading.getValue() == false) {
    //     clearInterval(intervalId);

    //     // set focus
    //     for (let i in that.forumGroup.controls) {
    //       that.forumGroup.controls[i].markAsTouched();
    //     }
    //     that.titleRef.nativeElement.focus();
    //   }
    // }, 3000);
  }
  
  ngOnInit () {
    const that = this;

    this._loading.next(true);    

    this.route.queryParams.subscribe((params: Params) => {
      this.parentForumId = params['forumId'];
      this.parentForumUserId = params['userId'];

      const childForum: Forum = {
        forumId: '',
        parentId: this.parentForumId,
        parentUid: this.parentForumUserId,
        uid: this.auth.uid,
        type: 'Private',
        title: '',
        title_lowercase: '',
        description: '',
        website: '',
        indexed: false,
        includeDescriptionInDetailPage: false,
        includeImagesInDetailPage: false,
        includeTagsInDetailPage: false,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };

      this._initialForumSubscription = this.userForumService.getForum(this.parentForumUserId, this.parentForumId)
        .subscribe(forum => {
          this._initialForumSubscription.unsubscribe();

          if (forum){
            if (forum.title.length > 0){
              this._tempForum = forum;

              if (forum.uid == this.auth.uid){
                // allow owner to create new forum
                this.parentForum = this.userForumService.getForum(this.parentForumUserId, this.parentForumId);
                this.forum = this.userForumService.create(this.auth.uid, childForum);
                this.initForm();
              }
              else {
                // ensure end user is registered in forum before creating a new one
                this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.parentForumUserId, this.parentForumId, this.auth.uid)
                  .then(registrant => {
                    if (registrant){
                      this.parentForum = this.userForumService.getForum(this.parentForumUserId, this.parentForumId);
                      this.forum = this.userForumService.create(this.auth.uid, childForum);
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
                  console.error(error);
                });
              }
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'Forum is missing a title',
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
      title:                              ['', Validators.required ],
      title_lowercase:                    [''],
      description:                        [''],
      website:                            [''],
      indexed:                            [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      searchPrivateServices:              [''],
      searchServiceIncludeTagsInSearch:   [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });
    
    this.forumGroup.get('searchPrivateServices').setValue(this.searchPrivateServices);
    this.forumGroup.get('searchServiceIncludeTagsInSearch').setValue(this.searchServiceIncludeTagsInSearch);

    this._parentForumSubscription = this.parentForum
      .subscribe(forum => {
        if (forum)
          this._tempForum = forum;
      }
    );

    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum)
          this.forumGroup.patchValue(forum);
      }
    );

    // run once subscription
    const runOnceSubscription = this.forum.subscribe(forum => {
      if (forum){
        let load = async function(){
          try {
            // forum totals
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

            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = registrants[0];
                else
                  that.defaultRegistrant = null;
              }
            );

            // default forum image
            that._defaultForumImageSubscription = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
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
            )
            .subscribe(forumImage => {
              if (forumImage)
                that.defaultForumImage = of(forumImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultThumbnail.jpg'
                };
                that.defaultForumImage = of(tempImage);
              }
            });
          
            // forum tags
            that.forumTags = that.userForumTagService.getTags(forum.uid, forum.forumId);

            // images
            that.images = that.userImageService.getImages(that.auth.uid, 1000, null, 'desc').pipe(
              switchMap(images => {
                if (images && images.length > 0){
                  let observables = images.map(image => {
                    let getDownloadUrl$: Observable<any>;
                    let genericRetryStrategy = ({
                      maxRetryAttempts = 3,
                      scalingDuration = 1000,
                      excludedStatusCodes = []
                    }: {
                      maxRetryAttempts?: number,
                      scalingDuration?: number,
                      excludedStatusCodes?: number[]
                    } = {}) => (attempts: Observable<any>) => {
                      return attempts.pipe(
                        mergeMap((error, i) => {
                          const retryAttempt = i + 1;
                          // if maximum number of retries have been met
                          // or response is a status code we don't wish to retry, throw error
                          if (
                            retryAttempt > maxRetryAttempts ||
                            excludedStatusCodes.find(e => e === error.status)
                          ) {
                            return throwError(error);
                          }
                          // retry after 1s, 2s, etc...
                          return timer(retryAttempt * scalingDuration);
                        })
                      );
                    };
        
                    if (image.smallUrl){
                      // defer image download url as it may not have arrived yet
                      getDownloadUrl$ = defer(() => firebase.storage().ref(image.smallUrl).getDownloadURL())
                        .pipe(
                          retryWhen(genericRetryStrategy({
                            maxRetryAttempts: 25
                          })),
                          catchError(error => of(error))
                        ).pipe(mergeMap(url => {
                          return of(url);
                        }
                      ));
                    }
                            
                    return combineLatest([getDownloadUrl$]).pipe(
                      switchMap(results => {
                        const [downloadUrl] = results;
                        
                        if (downloadUrl)
                          image.url = downloadUrl;
                        else
                          image.url = '../../../assets/defaultThumbnail.jpg';
          
                        return of(image);
                      })
                    );
                  });
            
                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      return images[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            // forum images
            that.forumImages = that.userForumImageService.getForumImages(forum.uid, forum.forumId, 1000, null).pipe(
              switchMap(forumImages => {
                if (forumImages && forumImages.length > 0){
                  let observables = forumImages.map(forumImage => {
                    let getDownloadUrl$: Observable<any>;
        
                    if (forumImage.smallUrl)
                      getDownloadUrl$ = from(firebase.storage().ref(forumImage.smallUrl).getDownloadURL());
        
                    return combineLatest([getDownloadUrl$]).pipe(
                      switchMap(results => {
                        const [downloadUrl] = results;
                        
                        if (downloadUrl)
                          forumImage.url = downloadUrl;
                        else
                          forumImage.url = '../../../assets/defaultThumbnail.jpg';
          
                        return of(forumImage);
                      })
                    );
                  });
            
                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      return forumImages[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            // get service serving in this forum
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

            if (that.forumGroup.get('searchPrivateServices').value == true){
              that.matAutoCompleteSearchServices = that.searchServiceCtrl.valueChanges.pipe(
                startWith(''),
                switchMap(searchTerm => 
                  that.userServiceService.search(that.auth.uid, searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value)
                )
              );
              
              that._searchServiceCtrlSubscription = that.searchServiceCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchServiceResults = that.userServiceService.tagSearch(that.auth.uid, searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
                    switchMap(services => {
                      if (services && services.length > 0){
                        let observables = services.map(service => {
                          if (service){
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
                })
              ).subscribe();

              // preload, service search results
              that.searchServiceResults = that.userServiceService.tagSearch(that.auth.uid, '', that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
                switchMap(services => {
                  if (services && services.length > 0){
                    let observables = services.map(service => {
                      if (service){
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
                switchMap(searchTerm => 
                  that.serviceService.search(searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true)
                )
              );

              that._searchServiceCtrlSubscription = that.searchServiceCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchServiceResults = that.serviceService.tagSearch(searchTerm, that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
                    switchMap(services => {
                      if (services && services.length > 0){
                        let observables = services.map(service => {
                          if (service){
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
                })
              ).subscribe();

              // preload, service search results
              that.searchServiceResults = that.serviceService.tagSearch('', that._tempServiceTags, that.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
                switchMap(services => {
                  if (services && services.length > 0){
                    let observables = services.map(service => {
                      if (service){
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

  setDefaultForumImage (forumImage) {
    if (this._settingDefaultForumImage == false){
      this._settingDefaultForumImage = true;

      // get old default image
      const tempForumImageSubscription = this.userForumImageService.getDefaultForumImages(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value)
        .subscribe(defaultForumImages => {
          if (defaultForumImages && defaultForumImages.length > 0){
            if (defaultForumImages[0].imageId != forumImage.imageId){
              // set old default image to false
              defaultForumImages[0].default = false;

              this.userForumImageService.update(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, defaultForumImages[0].imageId, defaultForumImages[0]).then(()=> {
                // set new forum image to true
                forumImage.default = true;

                this.userForumImageService.update(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumImage.imageId, forumImage).then(() => {
                  this._settingDefaultForumImage = false;
                })
                .catch(error => {
                  this._settingDefaultForumImage = false;
                });
              });
            }
            else {
              // set new forum image default to its opposite value
              forumImage.default = !forumImage.default;

              this.userForumImageService.update(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumImage.imageId, forumImage).then(() => {
                this._settingDefaultForumImage = false;
              })
              .catch(error => {
                this._settingDefaultForumImage = false;
              });
            }
          }
          else {
            // set new forum image default to its opposite
            forumImage.default = !forumImage.default;

            this.userForumImageService.update(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumImage.imageId, forumImage).then(() => {
              this._settingDefaultForumImage = false;
            })
            .catch(error => {
              this._settingDefaultForumImage = false;
            });
          }
          tempForumImageSubscription.unsubscribe();
        }
      );
    }
  }

  addImage (image) {
    if (this.forumGroup.status != 'VALID') {
      console.log('form is not valid, cannot save to database');

      setTimeout(() => {
        for (let i in this.forumGroup.controls) {
          this.forumGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
    }
    else {
      this.userForumImageService.exists(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, image.imageId).then(exists => {
        if (!exists){
          image.default = false;
          this.userForumImageService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, image);
        }
        else console.log('image already exists in forum');
      });
    }
  }

  removeForumImage (forumImage) {
    this.userForumImageService.exists(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumImage.imageId).then(exists => {
      if (exists)
        this.userForumImageService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumImage.imageId);
    });
  }

  removeForumTag (forumTag) {
    this.userForumTagService.exists(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumTag.tagId).then(exists => {
      if (exists)
        this.userForumTagService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, forumTag.tagId);
    });
  }

  removeSearchServiceTag (tag) {
    const tagIndex = _.findIndex(this.searchServiceTags, function(t) { return t.tagId == tag.tagId; });
    
    if (tagIndex > -1) {
      this.searchServiceTags.splice(tagIndex, 1);
      this._tempServiceTags.splice(tagIndex, 1);
      this.searchServiceTags.sort();
      this._tempServiceTags.sort();

      if (this.forumGroup.get('searchPrivateServices').value == true){
        this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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
        this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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
      this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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
      this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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

  addService (service) {
    if (this.forumGroup.status != 'VALID') {
      console.log('form is not valid, cannot save to database');
      setTimeout(() => {
        for (let i in this.forumGroup.controls) {
          this.forumGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
    }
    else {
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
                                        parentId: '',
                                        serviceId: service.serviceId,
                                        uid: service.uid,
                                        forumId: this.forumGroup.get('forumId').value,
                                        forumUid: this.forumGroup.get('uid').value,
                                        default: false,
                                        indexed: service.indexed,
                                        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                                        creationDate: firebase.firestore.FieldValue.serverTimestamp()
                                      };

                                      this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, service.uid)
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
                                          data: 'The service is already serving in the forum',
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

  removeRegistrant (registrant) {
    this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
      this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
    })
    .catch(error => {
      console.error(error);
    });
  }

  autoForumTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  autoSearchServiceTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  autoSearchServiceDisplayFn (service: any): string {
    return service? service.title: service;
  }

  forumTagsSelectionChange (tag: any) {
    if (this.forumGroup.get('title').value.length > 0){
      this.userForumTagService.exists(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, tag.tagId).then(exists => {
        if (!exists){
          this.userForumTagService.getTagCount(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value).then(count => {
            if (count < 5){
              if (this._addingTag.getValue() == false){
                this._addingTag.next(true);

                this.userForumTagService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, tag)
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
                  data: 'This is the alpha version of eleutherios and is limited to only 5 tags each forum',
                  panelClass: ['red-snackbar']
                }
              );
            }
          });
        }
      });
    }
  }

  searchServiceTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchServiceTags, function(t) { return t.tagId == tag.tagId; });
    
    if (tagIndex == -1){
      this.searchServiceTags.push(tag);
      this._tempServiceTags.push(tag.tag);
      this.searchServiceTags.sort();
      this._tempServiceTags.sort();

      if (this.forumGroup.get('searchPrivateServices').value == true){
        this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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
        this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true).pipe(
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

  createForumTag () {
    if (this.tagForumCtrl.value.length > 0){
      let valueToSearch = this.tagForumCtrl.value.replace(/\s\s+/g,' ').toLowerCase();

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
                    this.forumTagsSelectionChange(tags[0]);
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

  searchPrivateServicesClick () {
    if (this.forumGroup.get('searchPrivateServices').value == true){
      // search services
      this.matAutoCompleteSearchServices = this.searchServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.userServiceService.search(this.auth.uid, searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true)
        )
      );
      
      this._searchServiceCtrlSubscription = this.searchServiceCtrl.valueChanges.pipe(
        tap(searchTerm => {
          this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true);
        })
      ).subscribe();

      this.searchServiceResults = this.userServiceService.tagSearch(this.auth.uid, this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true);
    }
    else {
      // search services
      this.matAutoCompleteSearchServices = this.searchServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.serviceService.search(searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true)
        )
      );

      this._searchServiceCtrlSubscription = this.searchServiceCtrl.valueChanges.pipe(
       tap(searchTerm => {
          this.searchServiceResults = this.serviceService.tagSearch(searchTerm, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true);
        })
      ).subscribe();

      this.searchServiceResults = this.serviceService.tagSearch(this.searchServiceCtrl.value, this._tempServiceTags, this.forumGroup.get('searchServiceIncludeTagsInSearch').value, true);
    }
  }

  saveChanges () {
    if (this.forumGroup.status != 'VALID') {
      console.log('form is not valid, cannot save to database');
      return;
    }

    let tempTitle = this.forumGroup.get('title').value.replace(/\s\s+/g,' ');

    if (tempTitle.length <= 100){
      if (/^[A-Za-z0-9\s]*$/.test(tempTitle)){
        const forum: Forum = {
          forumId: this.forumGroup.get('forumId').value,
          parentId: this.forumGroup.get('parentId').value,
          parentUid: this.forumGroup.get('parentUid').value,
          uid: this.forumGroup.get('uid').value,
          type: this.forumGroup.get('type').value,
          title: tempTitle,
          title_lowercase: tempTitle.toLowerCase(),
          description: this.forumGroup.get('description').value.trim(),
          website: this.forumGroup.get('website').value.trim(),
          indexed: this.forumGroup.get('indexed').value,
          includeDescriptionInDetailPage: this.forumGroup.get('includeDescriptionInDetailPage').value,
          includeImagesInDetailPage: this.forumGroup.get('includeImagesInDetailPage').value,
          includeTagsInDetailPage: this.forumGroup.get('includeTagsInDetailPage').value,
          lastUpdateDate: this.forumGroup.get('lastUpdateDate').value,
          creationDate: this.forumGroup.get('creationDate').value
        };
    
        this.userForumService.update(forum.uid, forum.forumId, forum).then(() => {
          // associate forum to parent forum - done once
          this.userForumForumService.forumIsServingInForum(this.parentForumUserId, this.parentForumId, this.forumGroup.get('forumId').value)
            .then((isServing) => {
              if (!isServing) {
                this.userForumForumService.create(this.parentForumUserId, this.parentForumId, forum).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: 'Forum saved',
                      panelClass: ['green-snackbar']
                    }
                  );
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
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 5000,
                    data: 'Forum saved',
                    panelClass: ['green-snackbar']
                  }
                );
              }
            })
            .catch((error) => {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 5000,
                  data: error.message,
                  panelClass: ['green-snackbar']
                }
              );
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

  cancel () {
    this.userForumService.delete(this.auth.uid, this.forumGroup.get('forumId').value).then(()=>{
      this.router.navigate(['/']);
    });
  }
}