import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  ClickEvent
} from 'angular-star-rating';
import {
  SiteTotalService,
  UserServiceService,
  UserServiceImageService,
  UserServiceRateService,
  UserServiceReviewService,
  ServiceService,
  ServiceRate,
  Tag,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'service-rate-list',
  templateUrl: './service.rate.list.component.html',
  styleUrls: ['./service.rate.list.component.css']
})
export class ServiceRateListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _serviceSubscription: Subscription;
  private _serviceRateSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _rateAverage = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public rateAverage: Observable<number> = this._rateAverage.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public serviceTags: Observable<any[]>;
  public defaultServiceImage: Observable<any>;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();
  public serviceRates: Observable<any[]> = of([]);
  public serviceRatesArray: any[] = [];
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceRateService: UserServiceRateService,
    private userServiceReviewService: UserServiceReviewService,
    private serviceService: ServiceService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private router: Router) {
    }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._serviceRateSubscription)
      this._serviceRateSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceRates (index, serviceRate) { return serviceRate.serviceRateId; }

  ngOnInit () {
    this._loading.next(true);
    
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      let parentServiceId = params['parentServiceId'];

      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];

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

            // get rates for this service
            that.getServiceRatesList();
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

  getServiceRatesList (key?: any) {
    if (this._serviceRateSubscription)
      this._serviceRateSubscription.unsubscribe();
    
    this._searchLoading.next(true);

    this._serviceRateSubscription = this.userServiceRateService.getAllServiceRates(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, this.numberItems, key).pipe(
      switchMap(serviceRates => {
        if (serviceRates && serviceRates.length > 0){
          let observables = serviceRates.map(serviceRate => {
            if (serviceRate){
              return this.userServiceService.getService(serviceRate.serviceUid, serviceRate.serviceId).pipe(
                switchMap(service => {
                  if (service){
                    let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                    let getServiceReview$ = this.userServiceReviewService.getUserServiceReview(serviceRate.serviceRateServiceUid, serviceRate.serviceRateServiceId, service.uid, service.serviceId);
          
                    return combineLatest(getDefaultServiceImages$, getServiceReview$).pipe(
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
    
          return combineLatest(...observables, (...results) => {
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
      this.serviceRatesArray = _.slice(serviceRates, 0, this.numberItems);
      this.serviceRates = of(this.serviceRatesArray);
      this.nextKey = _.get(serviceRates[this.numberItems], 'creationDate');
      this._searchLoading.next(false);
    });
  }

  onUpdateRateClick($event: ClickEvent, serviceRate: ServiceRate){
    const updatedUserServiceRate: ServiceRate = {
      serviceRateId: serviceRate.serviceRateId,
      serviceRateServiceId: serviceRate.serviceRateServiceId,
      serviceRateServiceUid: serviceRate.serviceRateServiceUid,
      serviceId: serviceRate.serviceId,
      serviceUid: serviceRate.serviceUid,
      rate: $event.rating,
      lastUpdateDate: serviceRate.lastUpdateDate,
      creationDate: serviceRate.creationDate
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

  delete (serviceRate) {
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
    this.prevKeys.push(_.first(this.serviceRatesArray)['creationDate']);
    this.getServiceRatesList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServiceRatesList(prevKey);
  }
}