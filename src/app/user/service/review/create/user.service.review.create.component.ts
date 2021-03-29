import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  ClickEvent
} from 'angular-star-rating';

import {
  SiteTotalService,
  UserForumService,
  UserServiceService,
  UserServiceImageService,
  UserServiceReviewService,
  UserServiceRateService,
  ServiceService,
  ServiceReview,
  Service,
  ServiceRate,
  NoTitlePipe
} from '../../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-service-review-create',
  templateUrl: './user.service.review.create.component.html',
  styleUrls: ['./user.service.review.create.component.css']
})
export class UserServiceReviewCreateComponent implements OnInit, OnDestroy {
  @ViewChild('main', { static: false }) reviewRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  private _initialServiceSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _userServiceReviewSubscription: Subscription;
  private _userServiceSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _canViewService = new BehaviorSubject(false);
  private _userId: string = '';
  private _serviceId: string = '';

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public userServiceReviews: Observable<any[]> = of([]);
  public userServiceReviewsArray: any[] = [];
  public userServices: Observable<any[]>;
  public defaultServiceImage: Observable<any>;
  public userServicesCtrl: FormControl;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();
  public canViewService: Observable<boolean> = this._canViewService.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceReviewService: UserServiceReviewService,
    private userServiceRateService: UserServiceRateService,
    private serviceService: ServiceService,
    private snackbar: MatSnackBar,
    private fb: FormBuilder,
    private router: Router) {
      this.userServicesCtrl = new FormControl();
  }

  trackUserServices (index, service) { return service.serviceId; }
  trackUserServiceReviews (index, userServiceReview) { return userServiceReview.serviceReviewId; }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._initialServiceSubscription)
      this._initialServiceSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._userServiceReviewSubscription)
      this._userServiceReviewSubscription.unsubscribe();

    if (this._userServiceSubscription)
      this._userServiceSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  checkPermissions (parentUserId: string, service: Service) {
    return new Promise<void>((resolve, reject) => {
      this.userForumService.serviceIsServingInUserForumFromPromise(parentUserId, service.serviceId)
        .then(isServing => {
          if (service.type == 'Public')
            this._canViewService.next(true);
          else if (isServing && isServing == true)
            this._canViewService.next(true);
          else
            this._canViewService.next(false);

          resolve();
        }
      ).catch(error => {
        reject(error);
      });
    });
  }

  ngOnInit () {
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        // get params
        this.route.queryParams.subscribe((params: Params) => {
          let parentServiceUserId = params['parentServiceUserId'];
          let parentServiceId = params['parentServiceId'];

          // reset keys if the route changes either public/private
          this.nextKey = null;
          this.prevKeys = [];

          if (parentServiceUserId && parentServiceId){
            this._initialServiceSubscription = this.userServiceService.getService(parentServiceUserId, parentServiceId).pipe(take(1))
              .subscribe(service => {
                if (service){
                  if (service.uid != this.loggedInUserId){
                    if (service.indexed == true){
                      // check permissions
                      this.checkPermissions(this.loggedInUserId, service)
                        .then(() => {
                          this.service = this.userServiceService.getService(parentServiceUserId, parentServiceId);
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
                  else {
                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: 'You cannot review your own service',
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
      review:                             ['', Validators.required],
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

          if (service.uid != this.loggedInUserId){
            if (service.indexed == true){
              // check permissions
              this.checkPermissions(this.loggedInUserId, service)
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
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'You cannot review your own service',
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

            // get default service image
            that.getDefaultServiceImage();

            // get user services
            that._userServiceSubscription = that.userServiceService.getServices(that.loggedInUserId, that.numberItems, '', [], true, true)
              .subscribe(userServices => {
                if (userServices.length > 0) {
                  // set default user service
                  if (that._userId.length > 0 && that._serviceId.length > 0) {
                    userServices.forEach((userService, i) => {
                      if (userService.uid == that._userId && userService.serviceId == that._serviceId)
                        that.userServicesCtrl.setValue(userService);
                    });
                  }
                  that.userServices = of(userServices);
                }
                else that.userServices = of([]);
              }
            );

            // get user reviews for this service
            that.getUserServiceReviewsList(that.loggedInUserId);
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
                serviceImages[0].url = '../../../../../assets/defaultThumbnail.jpg';

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
          url: '../../../../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    });
  }

  private getUserServiceReviewsList (userId: string, key?: any) {
    if (this._userServiceReviewSubscription)
      this._userServiceReviewSubscription.unsubscribe();

    this._searchLoading.next(true);

    this._userServiceReviewSubscription = this.userServiceReviewService.getAllUserServiceReviews(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, userId, this.numberItems, key).pipe(
      switchMap(serviceReviews => {
        if (serviceReviews && serviceReviews.length > 0){
          let observables = serviceReviews.map(serviceReview => {
            if (serviceReview){
              let getService$ = this.userServiceService.getService(serviceReview.serviceUid, serviceReview.serviceId).pipe(
                switchMap(service => {
                  if (service) {
                    let getServiceRates$ = this.userServiceRateService.getUserServiceRate(serviceReview.serviceReviewServiceUid, serviceReview.serviceReviewServiceId, service.uid, service.serviceId);
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
                                serviceImages[0].url = '../../../../../assets/defaultThumbnail.jpg';

                              return of(serviceImages[0]);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );

                    return combineLatest([getServiceRates$, getDefaultServiceImage$]).pipe(
                      switchMap(results => {
                        const [serviceRates, defaultServiceImage] = results;

                        if (serviceRates && serviceRates.length > 0)
                          service.serviceRate = of(serviceRates[0]);
                        else
                          service.serviceRate = of(null);

                        if (defaultServiceImage)
                          service.defaultServiceImage = of(defaultServiceImage);
                        else {
                          let tempImage = {
                            url: '../../../../../assets/defaultThumbnail.jpg'
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
                    serviceReview.service = of(service);
                  else {
                    serviceReview.service = of(null);
                  }
                  return of(serviceReview);
                })
              );
            }
            else return of(null);
          });
          return zip(...observables);
        }
        else return of([]);
      })
    )
    .subscribe(serviceReviews => {
      this.userServiceReviewsArray = _.slice(serviceReviews, 0, this.numberItems);
      this.userServiceReviews = of(this.userServiceReviewsArray);
      this.nextKey = _.get(serviceReviews[this.numberItems], 'creationDate');
      this._searchLoading.next(false);
    });
  }

  private createServiceReview(review: string, service: Service){
    this.userServiceReviewService.userServiceReviewExists(
      this.serviceGroup.get('uid').value,
      this.serviceGroup.get('serviceId').value,
      service.uid,
      service.serviceId
    ).then(exists => {
      if (!exists){
        // create review
        const newServiceReview: ServiceReview = {
          serviceReviewId: '',
          serviceReviewServiceId: this.serviceGroup.get('serviceId').value,
          serviceReviewServiceUid: this.serviceGroup.get('uid').value,
          serviceId: service.serviceId,
          serviceUid: service.uid,
          review: review,
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
          creationDate: firebase.firestore.FieldValue.serverTimestamp()
        };

        this.userServiceReviewService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, newServiceReview).then(() => {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 5000,
              data: 'Review created',
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
            duration: 8000,
            data: `${ service.title } review already exists`,
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
    });
  }

  selectService(){
    if (this.userServicesCtrl.value && this.userServicesCtrl.value.title.length > 0){
      // if (this.serviceGroup.get('uid').value != this.userServicesCtrl.value.uid)
      //   this.createServiceReview(this.serviceGroup.get('review').value, this.userServicesCtrl.value);
      // else {
      //   const snackBarRef = this.snackbar.openFromComponent(
      //     NotificationSnackBar,
      //     {
      //       duration: 8000,
      //       data: 'You cannot review your own service',
      //       panelClass: ['red-snackbar']
      //     }
      //   );
      // }
      if (this.serviceGroup.get('review').value && this.serviceGroup.get('review').value.length > 0)
        this.createServiceReview(this.serviceGroup.get('review').value, this.userServicesCtrl.value);
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'You did not write a review',
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
          data: 'You did not select a service',
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  saveChanges () {
    if (this.serviceGroup.status != 'VALID') {
      setTimeout(() => {
        for (let i in this.serviceGroup.controls) {
          this.serviceGroup.controls[i].markAsTouched();
        }
        this.reviewRef.nativeElement.focus();
      }, 500);
      return;
    }

    if (this.userServicesCtrl.value && this.userServicesCtrl.value.title.length > 0){
      // if (this.serviceGroup.get('uid').value != this.userServicesCtrl.value.uid)
      //   this.createServiceReview(this.serviceGroup.get('review').value, this.userServicesCtrl.value);
      // else {
      //   const snackBarRef = this.snackbar.openFromComponent(
      //     NotificationSnackBar,
      //     {
      //       duration: 8000,
      //       data: 'You cannot review your own service',
      //       panelClass: ['red-snackbar']
      //     }
      //   );
      // }
      this.createServiceReview(this.serviceGroup.get('review').value, this.userServicesCtrl.value);
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: 'You did not select a service',
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  onUpdateRateClick($event: ClickEvent, userServiceRate: ServiceRate){
    const updatedUserServiceRate: ServiceRate = {
      serviceRateId: userServiceRate.serviceRateId,
      serviceRateServiceId: userServiceRate.serviceRateServiceId,
      serviceRateServiceUid: userServiceRate.serviceRateServiceUid,
      serviceId: userServiceRate.serviceId,
      serviceUid: userServiceRate.serviceUid,
      rate: $event.rating,
      lastUpdateDate: userServiceRate.lastUpdateDate,
      creationDate: userServiceRate.creationDate
    };

    this.userServiceRateService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, updatedUserServiceRate).then(() => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 5000,
          data: 'Rate updated',
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

  delete (serviceReview){
    this.userServiceReviewService.delete(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceReview.serviceReviewId).then(() => {
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

  onNext () {
    this.prevKeys.push(_.first(this.userServiceReviewsArray)['creationDate']);
    this.getUserServiceReviewsList(this.loggedInUserId, this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getUserServiceReviewsList(this.loggedInUserId, prevKey);
  }
}
