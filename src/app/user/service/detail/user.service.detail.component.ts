import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { Location } from '@angular/common';
import { MatExpansionPanel } from '@angular/material/expansion';
import {
  ClickEvent
} from 'angular-star-rating';

import {
  SiteTotalService,
  UserActivityService,
  UserServiceTagService,
  UserServiceService,
  UserForumService,
  UserServiceImageService,
  UserServiceForumBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  UserForumImageService,
  UserWhereServingService,
  UserForumRegistrantService,
  Registrant,
  Service,
  DownloadImageUrlPipe,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import * as firebase from 'firebase/app';
import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-service-detail',
  templateUrl: './user.service.detail.component.html',
  styleUrls: ['./user.service.detail.component.css']
})
export class UserServiceDetailComponent implements OnInit, OnDestroy  {
  @ViewChild('descriptionPanel', { static: true }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: true }) _descriptionPanelTitle: ElementRef;

  private _loading = new BehaviorSubject(false);
  private _routeSubscription: any;
  private _serviceSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _forumCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _rateAverage = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);
  private _canViewDetail = new BehaviorSubject(false);
  
  public service: Observable<any>;
  
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public rateAverage: Observable<number> = this._rateAverage.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public serviceGroup: FormGroup;
  public userForums: Observable<any[]>;
  public whereServings: Observable<any[]>;
  public serviceTags: Observable<any[]>;
  public userForumsCtrl: FormControl;
  public numberItems: number = 100;  
  public id: Observable<string>;
  public returnUserId: Observable<string>;
  public returnType: Observable<string> = of('Forum');
  public loading: Observable<boolean> = this._loading.asObservable();
  public canViewDetail: Observable<boolean> = this._canViewDetail.asObservable();
  public defaultServiceImage: Observable<any>;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userServiceTagService: UserServiceTagService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userForumImageService: UserForumImageService,
    private userWhereServingService: UserWhereServingService,
    private userForumRegistrantService: UserForumRegistrantService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar,
    private location: Location,
    private changeDetector : ChangeDetectorRef) {
      this.userForumsCtrl = new FormControl();
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else 
      this._descriptionPanelTitle.nativeElement.style.display = "block";
  }

  addForum () {
    if (this.serviceGroup.get('title').value.length > 0){
      if (this.userForumsCtrl.value.title.length > 0){
        this.userForumServiceBlockService.serviceIsBlocked(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, this.serviceGroup.get('serviceId').value)
          .then(serviceBlocked => {
            if (!serviceBlocked) {
              this.userServiceUserBlockService.userIsBlocked(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, this.serviceGroup.get('uid').value)
                .then(serviceUserBlock => {
                  if (!serviceUserBlock) {
                    this.userServiceForumBlockService.forumIsBlocked(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, this.userForumsCtrl.value.forumId)
                      .then(forumBlocked => {
                        if (!forumBlocked) {
                          this.userForumUserBlockService.userIsBlocked(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, this.userForumsCtrl.value.uid)
                            .then(forumUserBlock => {
                              if (!forumUserBlock) {
                                this.userForumRegistrantService.serviceIsServingInForum(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, this.serviceGroup.get('serviceId').value)
                                  .then(isServing => {
                                    if (!isServing) {
                                      const newRegistrant: Registrant = {
                                        registrantId: '',
                                        parentId: '',
                                        serviceId: this.serviceGroup.get('serviceId').value,
                                        uid: this.serviceGroup.get('uid').value,
                                        forumId: this.userForumsCtrl.value.forumId,
                                        forumUid: this.userForumsCtrl.value.uid,
                                        default: false,
                                        indexed: this.serviceGroup.get('indexed').value,
                                        creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                                        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                                      };

                                      this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, this.serviceGroup.get('uid').value)
                                        .then(registrant => {
                                          if (registrant == null)
                                            newRegistrant.default = true;

                                          this.userForumRegistrantService.create(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, newRegistrant).then(() => {
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
                                          duration: 8000,
                                          data: `The service '${this.serviceGroup.get('title').value}' is already serving in the forum '${this.userForumsCtrl.value.title}'`,
                                          panelClass: ['red-snackbar']
                                        }
                                      );
                                    }
                                  })
                                  .catch((error) => {
                                    console.log("error adding forum to service " + JSON.stringify(error));
                                  }
                                );
                              }
                              else {
                                const snackBarRef = this.snackbar.openFromComponent(
                                  NotificationSnackBar,
                                  {
                                    duration: 8000,
                                    data: `The user of the forum '${this.userForumsCtrl.value.title}' has been blocked from requesting the service '${this.serviceGroup.get('title').value}'`,
                                    panelClass: ['red-snackbar']
                                  }
                                );
                              }
                            })
                            .catch((error) => {
                              console.log("error adding forum to service " + JSON.stringify(error));
                            }
                          );
                        }
                        else {
                          const snackBarRef = this.snackbar.openFromComponent(
                            NotificationSnackBar,
                            {
                              duration: 8000,
                              data: `The forum '${this.userForumsCtrl.value.title}' has been blocked from requesting the service '${this.serviceGroup.get('title').value}'`,
                              panelClass: ['red-snackbar']
                            }
                          );
                        }
                      })
                      .catch((error) => {
                        console.log("error adding forum to service " + JSON.stringify(error));
                      }
                    );
                  }
                  else {
                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: `The user of the service '${this.serviceGroup.get('title').value}' has been blocked from serving in the forum '${this.userForumsCtrl.value.title}'`,
                        panelClass: ['red-snackbar']
                      }
                    );
                  }
                })
                .catch((error) => {
                  console.log("error adding forum to service " + JSON.stringify(error));
                }
              );
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `The service '${this.serviceGroup.get('title').value}' has been blocked from serving in the forum '${this.userForumsCtrl.value.title}'`,
                  panelClass: ['red-snackbar']
                }
              );
            }
          })
          .catch((error) => {
            console.log("error adding forum to service " + JSON.stringify(error));
          }
        );
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
      }
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

  removeWhereServing (whereServing) {
    this.userForumRegistrantService.getRegistrantFromPromise(whereServing.uid, whereServing.forumId, this.serviceGroup.get('serviceId').value).then(registrant => {
      if (registrant){
        this.userForumRegistrantService.delete(whereServing.uid, whereServing.forumId, this.serviceGroup.get('serviceId').value).then(() => {
          this.userActivityService.removeRegistrant(registrant.uid, registrant.forumId, registrant).then(() => {
            // do something
          })
          .catch(error => {
            console.error(error);
          });  
        })
        .catch(error => {
          console.error(error);
        });
      }
    })
    .catch(error => {
      console.error(error);
    });
  }

  changeType (service) {
    this.userServiceService.getServiceFromPromise(service.uid, service.serviceId)
      .then(fetchedService => {
        if (fetchedService){
          if (fetchedService.type == 'Public')
            fetchedService.type = 'Private';
          else
            fetchedService.type = 'Public';

          this.userServiceService.update(fetchedService.uid, fetchedService.serviceId, fetchedService);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Service with serviceId ${service.serviceId} was removed or does not exist`,
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

  indexDeindexService (service){
    this.userServiceService.getServiceFromPromise(service.uid, service.serviceId)
      .then(fetchedService => {
        if (fetchedService){
          fetchedService.indexed = !fetchedService.indexed;
          this.userServiceService.update(fetchedService.uid, fetchedService.serviceId, fetchedService);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Service with serviceId ${service.serviceId} was removed or does not exist`,
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

  delete (service) {
    this.userServiceService.delete(service.uid, service.serviceId).then(() => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 5000,
          data: 'Service was successfully removed',
          panelClass: ['green-snackbar']
        }
      );
      this.router.navigate(['/']);
    })
    .catch(error => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: error,
          panelClass: ['red-snackbar']
        }
      );
      this.router.navigate(['/']);
    });
  }

  getDefaultServiceImage () {
    // default service image
    this._defaultServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value)
      .subscribe(serviceImages => {
        if (serviceImages && serviceImages.length > 0)
          this.defaultServiceImage = of(serviceImages[0]);
        else {
          let tempImage = {
            smallUrl: '../../../assets/defaultThumbnail.jpg',
            name: 'No image'
          };
          this.defaultServiceImage = of(tempImage);
        }
      }
    );
  }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();
  
    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._routeSubscription)
      this._routeSubscription.unsubscribe();
  }

  trackServiceTags (index, serviceTag) { return serviceTag.tagId; }
  trackWhereServings (index, whereServing) { return whereServing.forumId; }
  trackUserForums (index, forum) { return forum.forumId; }

  checkPermissions (parentUserId: string, service: Service) {
    return new Promise<boolean>((resolve, reject) => {
      this.userForumService.serviceIsServingInUserForumFromPromise(parentUserId, service.serviceId)
        .then(isServing => {
          if (service.type == 'Public')
            this._canViewDetail.next(true);
          else if (service.uid == this.auth.uid)
            this._canViewDetail.next(true);
          else if (isServing && isServing == true)
            this._canViewDetail.next(true);
          else
            this._canViewDetail.next(false);

          resolve();
        }
      ).catch(error => {
        reject(error);
      });
    });
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let serviceId = params['serviceId'];
      let serviceUserId = params['userId'];
      let forumId = params['forumId'];
      let forumUserId = params['forumUserId'];
      let notificationId = params['notificationId'];
      let notificationUserId = params['notificationUserId'];

      if (forumId || notificationId){
        if (forumId){
          this.id = of(forumId);
          this.returnUserId = of(forumUserId);
          this.returnType = of('Forum');
        }
        else {
          this.id = of(notificationId);
          this.returnUserId = of(notificationUserId);
          this.returnType = of('Notification');
        }
      }
  
      if (serviceId){
        this.userServiceService.getServiceFromPromise(serviceUserId, serviceId)
          .then(service => {
            if (service){
              if (service.uid == this.auth.uid){
                this._canViewDetail.next(true);
                this.service = this.userServiceService.getService(serviceUserId, serviceId);
                this.initForm();
              }
              else {
                if (service.indexed == true){
                  // check permissions
                  this.checkPermissions(this.auth.uid, service)
                    .then(() => {
                      this.service = this.userServiceService.getService(serviceUserId, serviceId);
                      this.initForm();
                    }
                  ).catch(error => {
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
                else {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: 'Service does not exist',
                      panelClass: ['red-snackbar']
                    }
                  );
                  this.router.navigate(['/']);
                }
              }
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'Service does not exist or was recently removed',
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
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'There was no serviceId supplied',
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/']);
      }
    });
  }

  private initForm () {
    const that = this;
    
    this.serviceGroup = this.fb.group({
      serviceId:                          [''],
      uid:                                [''],
      type:                               [''],
      title:                              [''],
      title_lowercase:                    [''],
      description:                        [''],
      website:                            [''],
      default:                            [''],
      indexed:                            [''],
      rate:                               [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });

    //  ongoing subscription
    this._serviceSubscription = this.service
      .subscribe(service => {
        if (service){
          this.serviceGroup.patchValue(service);

          if (service.uid == this.auth.uid)
            this._canViewDetail.next(true);
          else {
            if (service.indexed == true){
              // check permissions
              this.checkPermissions(this.auth.uid, service)
                .then(() => {
                  // do something
                }
              ).catch(error => {
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
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'Service does not exist',
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/']);
            }
          }
        }
      }
    );

    // run once subscription
    const runOnceSubscription = this.service.subscribe(service => {
      if (service){
        let load = async function(){
          try {
            // service totals
            that._totalSubscription = that.siteTotalService.getTotal(service.serviceId)
              .subscribe(total => {
                if (total) {
                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);

                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);
                    
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);

                  if (total.rateAverage == 0)
                    that._rateAverage.next(-1);
                  else
                    that._rateAverage.next(total.rateAverage);

                  if (total.rateCount == 0)
                    that._rateCount.next(-1);
                  else
                    that._rateCount.next(total.rateCount);

                  if (total.reviewCount == 0)
                    that._reviewCount.next(-1);
                  else
                    that._reviewCount.next(total.reviewCount);
                }
              }
            );

            // tags for this service
            that.serviceTags = that.userServiceTagService.getTags(service.uid, service.serviceId);

            // which forums this service is serving in
            that.whereServings = that.userWhereServingService.getWhereServings(service.uid, service.serviceId).pipe(
              switchMap(whereServings => {
                if (whereServings && whereServings.length > 0) {
                  let observables = whereServings.map(whereServing => {
                    return that.userForumService.getForum(whereServing.uid, whereServing.forumId).pipe(
                      switchMap(forum => {
                        if (forum) {
                          let getDefaultForumImages$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId);

                          return combineLatest([getDefaultForumImages$]).pipe(
                            switchMap(results => {
                              const [defaultForumImages] = results;

                              if (defaultForumImages && defaultForumImages.length > 0)
                                forum.defaultForumImage = of(defaultForumImages[0]);
                              else {
                                let tempImage = {
                                  tinyUrl: '../../../assets/defaultTiny.jpg',
                                  name: 'No image'
                                };
                                forum.defaultForumImage = of(tempImage);
                              }
                              return of(forum);
                            })
                          );
                        }
                        else
                          return of(null);
                      })
                    );
                  });

                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      if (result)
                        whereServings[i].forum = of(result);
                      else
                        whereServings[i].forum = of(null);
                      return whereServings[i];
                    });
                  });
                }
                else return of([]);
              }),
              map(whereServings => {
                return whereServings.filter(whereServing => {
                  if (whereServing.forum) {
                    if (whereServing.forum.value.type == 'Public' || that.auth.uid == service.uid || that.auth.uid == whereServing.forum.value.uid)
                      return true;
                    else
                      return false;
                  }
                  else
                    return false;
                }).map(whereServing => {
                  return { ...whereServing };
                });
              })
            );

            // forums this user has created so they can request the service serve in their forum(s)
            that.userForums = that.userForumService.getForums(that.auth.uid, that.numberItems, '', [], true, true);

            // get default service image
            that.getDefaultServiceImage();
          }
          catch (error) {
            throw error;
          }
        }
    
        // call load
        load().then(() => {
          this._loading.next(false);
          this.changeDetector.detectChanges();

          if (this._descriptionPanel)
            this._descriptionPanel.open();
            
          runOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }

  public navigateBack () {
    this.location.back();
  }
}