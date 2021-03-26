import { Component, AfterViewInit, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { MatExpansionPanel } from '@angular/material/expansion';
import {
  ClickEvent
} from 'angular-star-rating';

import {
  SiteTotalService,
  UserActivityService,
  UserForumService,
  UserForumRegistrantService,
  UserForumImageService,
  UserServiceImageService,
  UserServiceTagService,
  UserWhereServingService,
  UserServiceService,
  UserServiceForumBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  ServiceService,
  Registrant,
  User,
  NoTitlePipe
} from '../../shared';
import { environment } from '../../../environments/environment';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";


// ************************************************************************************************************
// ************************************************************************************************************
// ************************************************************************************************************
// 1) HERE ROB ENABLE END USERS WHO HAVE PAID FOR THIS SERVICE TO VIEW IT INCLUDING IMAGES ON IMAGE LIST PAGE
// 2) DELETE END USER
// ************************************************************************************************************
// ************************************************************************************************************
// ************************************************************************************************************


@Component({
  selector: 'service-detail',
  templateUrl: './service.detail.component.html',
  styleUrls: ['./service.detail.component.css']
})
export class ServiceDetailComponent implements OnInit, AfterViewInit, OnDestroy  {
  @ViewChild('descriptionPanel', { static: false }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: false }) _descriptionPanelTitle: ElementRef;

  private _loading = new BehaviorSubject(false);
  private _userSubscription = new Subscription;
  private _initialServiceSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _defaultReviewSubscription: Subscription;
  private _routeSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _rateAverage = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);

  public service: Observable<any>;
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
  public defaultServiceImage: Observable<any>;
  public defaultReview: Observable<any>;
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumService: UserForumService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userWhereServingService: UserWhereServingService,
    private userServiceService: UserServiceService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private serviceService: ServiceService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar,
    private location: Location,
    private http: HttpClient) {
      this.userForumsCtrl = new FormControl();
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else
      this._descriptionPanelTitle.nativeElement.style.display = "block";
  }

  changeType () {
    this.userServiceService.getServiceFromPromise(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value)
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
              data: `Service with serviceId ${this.serviceGroup.get('serviceId').value} does not exist or was removed`,
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

  indexDeindexService (){
    this.userServiceService.getServiceFromPromise(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value)
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
              data: `Service with serviceId ${this.serviceGroup.get('serviceId').value} does not exist or was removed`,
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

  delete () {
    this.userServiceService.delete(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value).then(() => {
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
                                this.userForumRegistrantService.serviceIsServingInForumFromPromise(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, this.serviceGroup.get('serviceId').value)
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

  getDefaultServiceImage () {
    // default service image
    this._defaultServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value).pipe(
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
                serviceImages[0].url = '../../assets/defaultThumbnail.jpg';

              return of(serviceImages[0]);
            })
          );
        }
        else return of(null);
      })
    )
    .subscribe(serviceImage => {
      if (serviceImage)
        this.defaultServiceImage = of(serviceImage);
      else {
        let tempImage = {
          url: '../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    });
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._initialServiceSubscription)
      this._initialServiceSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._defaultReviewSubscription)
      this._defaultReviewSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._routeSubscription)
      this._routeSubscription.unsubscribe();
  }

  trackServiceTags (index, serviceTag) { return serviceTag.tagId; }
  trackWhereServings (index, whereServing) { return whereServing.forumId; }
  trackUserForums (index, forum) { return forum.forumId; }

  ngAfterViewInit () {
    const that = this;

    let intervalId = setInterval(function() {
      if (that._loading.getValue() == false) {
        clearInterval(intervalId);

        // that.paymentRequest = that.stripeService.can({
        //   country: 'US',
        //   currency: 'usd'
        // });

        // if (that.forumGroup.get('title') && that.forumGroup.get('title').value.length == 0){
        //   // set focus
        //   for (let i in that.forumGroup.controls) {
        //     that.forumGroup.controls[i].markAsTouched();
        //   }
        //   that.titleRef.nativeElement.focus();
        // }
      }
    }, 500);
  }

  ngOnInit () {
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this._routeSubscription = this.route.queryParams.subscribe((params: Params) => {
          let serviceId = params['serviceId'];
          let forumId = params['forumId'];
          let forumUserId = params['forumUserId'];

          if (forumId){
            this.id = of(forumId);
            this.returnUserId = of(forumUserId);
            this.returnType = of('Forum');
          }

          if (serviceId){
            this._initialServiceSubscription = this.serviceService.getService(serviceId).pipe(take(1))
              .subscribe(service => {
                if (service){
                  this.service = this.serviceService.getService(serviceId);
                  this.initForm();
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
            );
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
      paymentType:                        [''],
      amount:                             [''],
      currency:                           [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });

    //  ongoing subscription
    this._serviceSubscription = this.service
      .subscribe(service => {
        if (service)
          this.serviceGroup.patchValue(service);
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
              map(whereServings => {
                return whereServings.filter(whereServing => {
                  if (whereServing.type == 'Public' || that.loggedInUserId == service.uid || that.loggedInUserId == whereServing.uid)
                    return true;
                  else
                    return false;
                }).map(whereServing => {
                  return { ...whereServing };
                });
              }),
              switchMap(whereServings => {
                if (whereServings && whereServings.length > 0) {
                  let observables = whereServings.map(whereServing => {
                    let getForum$ = that.userForumService.getForum(whereServing.uid, whereServing.forumId).pipe(
                      switchMap(forum => {
                        if (forum) {
                          let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.loggedInUserId).pipe(
                            switchMap(registrants => {
                              if (registrants && registrants.length > 0)
                                return of(registrants[0]);
                              else
                                return of(null);
                            })
                          );

                          let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
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
                                      forumImages[0].url = '../../assets/defaultTiny.jpg';

                                    return of(forumImages[0]);
                                  })
                                );
                              }
                              else return of(null);
                            })
                          );

                          return combineLatest([getDefaultRegistrant$, getDefaultForumImage$]).pipe(
                            switchMap(results => {
                              const [defaultRegistrant, defaultForumImage] = results;

                              if (defaultRegistrant)
                                forum.defaultRegistrant = of(defaultRegistrant);
                              else
                                forum.defaultRegistrant = of(null);

                              if (defaultForumImage)
                                forum.defaultForumImage = of(defaultForumImage);
                              else {
                                let tempImage = {
                                  url: '../../assets/defaultTiny.jpg'
                                };
                                forum.defaultForumImage = of(tempImage);
                              }
                              return of(forum);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );

                    return combineLatest([getForum$]).pipe(
                      switchMap(results => {
                        const [forum] = results;

                        if (forum)
                          whereServing.forum = of(forum);
                        else {
                          whereServing.forum = of(null);
                        }
                        return of(whereServing);
                      })
                    );
                  });
                  return zip(...observables);
                }
                else return of([]);
              })
            );

            // forums this user has created so they can request the service serve in their forum(s)
            that.userForums = that.userForumService.getForums(that.loggedInUserId, that.numberItems, '', [], true, true);

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
