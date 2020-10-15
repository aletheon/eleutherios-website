import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  ClickEvent
} from 'angular-star-rating';

import {
  SiteTotalService,
  UserServiceService,
  UserServiceImageService,
  UserServiceReviewService,
  UserServiceRateService,
  ServiceService,
  ServiceReview,
  Service,
  ServiceRate,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import * as firebase from 'firebase/app';
import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'service-review-view',
  templateUrl: './service.review.view.component.html',
  styleUrls: ['./service.review.view.component.css']
})
export class ServiceReviewViewComponent implements OnInit, OnDestroy  {
  @ViewChild('main', { static: true }) reviewRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _serviceSubscription: Subscription;
  private _userServiceReviewSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _userId: string = '';
  private _serviceId: string = '';

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public defaultServiceImage: Observable<any>;
  public userServiceReview: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceReviewService: UserServiceReviewService,
    private userServiceRateService: UserServiceRateService,
    private serviceService: ServiceService,
    private snackbar: MatSnackBar,
    private fb: FormBuilder,
    private router: Router) {
  }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._userServiceReviewSubscription)
      this._userServiceReviewSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);
    
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      let parentServiceId = params['parentServiceId'];
      this._userId = params['userId'];
      this._serviceId = params['serviceId'];

      if (parentServiceId){
        this.serviceService.getServiceFromPromise(parentServiceId)
          .then(service => {
            if (service){
              this.service = this.serviceService.getService(parentServiceId);
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

            that._userServiceReviewSubscription = that.userServiceReviewService.getUserServiceReview(that.serviceGroup.get('uid').value, that.serviceGroup.get('serviceId').value, that._userId, that._serviceId).pipe(
              switchMap(serviceReviews => {
                if (serviceReviews && serviceReviews.length > 0){
                  let observables = serviceReviews.map(serviceReview => {
                    if (serviceReview){
                      return that.userServiceService.getService(serviceReview.serviceUid, serviceReview.serviceId).pipe(
                        switchMap(service => {
                          if (service){
                            let getDefaultServiceImages$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                            let getServiceRate$ = that.userServiceRateService.getUserServiceRate(serviceReview.serviceReviewServiceUid, serviceReview.serviceReviewServiceId, service.uid, service.serviceId);
                  
                            return combineLatest([getDefaultServiceImages$, getServiceRate$]).pipe(
                              switchMap(results => {
                                const [defaultServiceImages, serviceRates] = results;
                  
                                if (defaultServiceImages && defaultServiceImages.length > 0)
                                  service.defaultServiceImage = of(defaultServiceImages[0]);
                                else {
                                  let tempImage = {
                                    smallUrl: '../../../assets/defaultThumbnail.jpg',
                                    name: 'No image'
                                  };
                                  service.defaultServiceImage = of(tempImage);
                                }

                                if (serviceRates && serviceRates.length > 0)
                                  service.serviceRate = of(serviceRates[0]);
                                else
                                  service.serviceRate = of(null);

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
                        serviceReviews[i].service = of(result);
                      else
                        serviceReviews[i].service = of(null);

                      return serviceReviews[i];
                    });
                  });
                }
                else return of([]);
              })
            )
            .subscribe(serviceReviews => {
              if (serviceReviews && serviceReviews.length > 0)
                that.userServiceReview = of(serviceReviews[0]);
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: 'Service review does not exist or was recently removed',
                    panelClass: ['red-snackbar']
                  }
                );
                this.router.navigate(['/']);
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

  changeReview (userServiceReview, newReview: string) {
    if (userServiceReview.review.trim() != newReview.trim()){
      if (newReview.trim().length > 0){
        let updatedServiceReview: ServiceReview = {
          serviceReviewId: userServiceReview.serviceReviewId,
          serviceReviewServiceId: userServiceReview.serviceReviewServiceId,
          serviceReviewServiceUid: userServiceReview.serviceReviewServiceUid,
          serviceId: userServiceReview.serviceId,
          serviceUid: userServiceReview.serviceUid,
          review: newReview,
          lastUpdateDate: userServiceReview.lastUpdateDate,
          creationDate: userServiceReview.creationDate
        };

        this.userServiceReviewService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, updatedServiceReview).then(() => {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 5000,
              data: 'Review updated',
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
            data: 'Review cannot be empty',
            panelClass: ['red-snackbar']
          }
        );
        this.reviewRef.nativeElement.focus();
      }
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
}