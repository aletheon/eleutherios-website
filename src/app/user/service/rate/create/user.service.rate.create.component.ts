import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import {
  ClickEvent
} from 'angular-star-rating';

import {
  SiteTotalService,
  UserForumService,
  UserServiceService,
  UserServiceImageService,
  UserServiceRateService,
  UserServiceReviewService,
  ServiceService,
  ServiceRate,
  Service,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../../shared/components/notification.snackbar.component';

import * as firebase from 'firebase/app';
import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-service-rate-create',
  templateUrl: './user.service.rate.create.component.html',
  styleUrls: ['./user.service.rate.create.component.css']
})
export class UserServiceRateCreateComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _serviceSubscription: Subscription;
  private _userServiceRateSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _rateAverage = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);
  private _canViewService = new BehaviorSubject(false);
  private _rate: number = 0;

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public rateAverage: Observable<number> = this._rateAverage.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public userServiceRates: Observable<any[]> = of([]);
  public userServiceRatesArray: any[] = [];
  public userServices: Observable<any[]>;
  public defaultServiceImage: Observable<any>;
  public userServicesCtrl: FormControl;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();
  public canViewService: Observable<boolean> = this._canViewService.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceRateService: UserServiceRateService,
    private userServiceReviewService: UserServiceReviewService,
    private snackbar: MatSnackBar,
    private fb: FormBuilder,
    private router: Router) {
      this.userServicesCtrl = new FormControl();
  }

  trackUserServices (index, service) { return service.serviceId; }
  trackUserServiceRates (index, userServiceRate) { return userServiceRate.serviceRateId; }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._userServiceRateSubscription)
      this._userServiceRateSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  checkPermissions (parentUserId: string, service: Service) {
    return new Promise<boolean>((resolve, reject) => {
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
    
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      let parentServiceUserId = params['parentServiceUserId'];
      let parentServiceId = params['parentServiceId'];

      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];

      if (parentServiceUserId && parentServiceId){
        this.userServiceService.getServiceFromPromise(parentServiceUserId, parentServiceId)
          .then(service => {
            if (service){
              if (service.uid != this.auth.uid){
                if (service.indexed == true){
                  // check permissions
                  this.checkPermissions(this.auth.uid, service)
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
                    data: 'You cannot rate your own service',
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

          if (service.uid != this.auth.uid){
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
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'You cannot rate your own service',
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

            // get default service image
            that.getDefaultServiceImage();

            // get user services
            that.userServices = that.userServiceService.getServices(that.auth.uid, that.numberItems, '', [], true, true);

            // get user rates for this service
            that.getUserServiceRatesList(that.auth.uid);
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

  private getDefaultServiceImage () {
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

  private getUserServiceRatesList (userId: string, key?: any) {
    if (this._userServiceRateSubscription)
      this._userServiceRateSubscription.unsubscribe();
    
    this._searchLoading.next(true);

    this._userServiceRateSubscription = this.userServiceRateService.getAllUserServiceRates(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, userId, this.numberItems, key).pipe(
      switchMap(serviceRates => {
        if (serviceRates && serviceRates.length > 0){
          let observables = serviceRates.map(serviceRate => {
            if (serviceRate){
              return this.userServiceService.getService(serviceRate.serviceUid, serviceRate.serviceId).pipe(
                switchMap(service => {
                  if (service){
                    let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                    let getServiceReview$ = this.userServiceReviewService.getUserServiceReview(serviceRate.serviceRateServiceUid, serviceRate.serviceRateServiceId, service.uid, service.serviceId);
          
                    return combineLatest([getDefaultServiceImages$, getServiceReview$]).pipe(
                      switchMap(results => {
                        const [defaultServiceImages, serviceReviews] = results;
          
                        if (defaultServiceImages && defaultServiceImages.length > 0)
                          service.defaultServiceImage = of(defaultServiceImages[0]);
                        else {
                          let tempImage = {
                            smallUrl: '../../../assets/defaultThumbnail.jpg',
                            name: 'No image'
                          };
                          service.defaultServiceImage = of(tempImage);
                        }

                        if (serviceReviews && serviceReviews.length > 0)
                          service.serviceReview = of(serviceReviews[0]);
                        else
                          service.serviceReview = of(null);

                        return of(service);
                      })
                    );
                  }
                  else return of(null);
                })
              );
            }
            else return of(null);
          });
    
          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              if (result)
                serviceRates[i].service = of(result);
              else
                serviceRates[i].service = of(null);

              return serviceRates[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(serviceRates => {
      this.userServiceRatesArray = _.slice(serviceRates, 0, this.numberItems);
      this.userServiceRates = of(this.userServiceRatesArray);
      this.nextKey = _.get(serviceRates[this.numberItems], 'creationDate');
      this._searchLoading.next(false);
    });
  }

  private createServiceRate(rate: number, service: Service){
    this.userServiceRateService.userServiceRateExists(
      this.serviceGroup.get('uid').value,
      this.serviceGroup.get('serviceId').value,
      service.uid,
      service.serviceId
    ).then(exists => {
      if (!exists){
        // create rate
        const newServiceRate: ServiceRate = {
          serviceRateId: '',
          serviceRateServiceId: this.serviceGroup.get('serviceId').value,
          serviceRateServiceUid: this.serviceGroup.get('uid').value,
          serviceId: service.serviceId,
          serviceUid: service.uid,
          rate: rate,
          creationDate: firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
        };

        this.userServiceRateService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, newServiceRate).then(() => {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 5000,
              data: 'Rate created',
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
            data: `${ service.title } rating already exists`,
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
      //   this.createServiceRate(this._rate, this.userServicesCtrl.value);
      // else {
      //   const snackBarRef = this.snackbar.openFromComponent(
      //     NotificationSnackBar,
      //     {
      //       duration: 8000,
      //       data: 'You cannot rate your own service',
      //       panelClass: ['red-snackbar']
      //     }
      //   );
      // }
      if (this._rate > 0)
        this.createServiceRate(this._rate, this.userServicesCtrl.value);
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'You did not choose a rating',
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
          data: 'You did not choose a service',
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  onRateClick($event: ClickEvent){
    this._rate = $event.rating;

    if (this.userServicesCtrl.value && this.userServicesCtrl.value.title.length > 0){
      // if (this.serviceGroup.get('uid').value != this.userServicesCtrl.value.uid)
      //   this.createServiceRate(this._rate, this.userServicesCtrl.value);
      // else {
      //   const snackBarRef = this.snackbar.openFromComponent(
      //     NotificationSnackBar,
      //     {
      //       duration: 8000,
      //       data: 'You cannot rate your own service',
      //       panelClass: ['red-snackbar']
      //     }
      //   );
      // }
      this.createServiceRate(this._rate, this.userServicesCtrl.value);
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: 'You did not choose a service',
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

  delete (serviceRate){
    this.userServiceRateService.delete(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceRate.serviceRateId).then(() => {
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
    this.prevKeys.push(_.first(this.userServiceRatesArray)['creationDate']);
    this.getUserServiceRatesList(this.auth.uid, this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getUserServiceRatesList(this.auth.uid, prevKey);
  }
}