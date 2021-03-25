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
  UserServiceReviewService,
  UserServiceRateService,
  ServiceService,
  ServiceReview,
  ServiceRate,
  Service,
  Tag,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'service-review-list',
  templateUrl: './service.review.list.component.html',
  styleUrls: ['./service.review.list.component.css']
})
export class ServiceReviewListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _searchLoading = new BehaviorSubject(false);
  private _initialServiceSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _serviceReviewSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);
  private _reviewCount = new BehaviorSubject(0);
  private _rateCount = new BehaviorSubject(0);

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public reviewCount: Observable<number> = this._reviewCount.asObservable();
  public rateCount: Observable<number> = this._rateCount.asObservable();
  public serviceTags: Observable<any[]>;
  public defaultServiceImage: Observable<any>;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public searchLoading: Observable<boolean> = this._searchLoading.asObservable();
  public serviceReviews: Observable<any[]> = of([]);
  public serviceReviewsArray: any[] = [];

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceReviewService: UserServiceReviewService,
    private userServiceRateService: UserServiceRateService,
    private serviceService: ServiceService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private router: Router) {
    }

  ngOnDestroy () {
    if (this._initialServiceSubscription)
      this._initialServiceSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._serviceReviewSubscription)
      this._serviceReviewSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceReviews (index, serviceReview) { return serviceReview.serviceReviewId; }

  ngOnInit () {
    this._loading.next(true);

    // get params
    this.route.queryParams.subscribe((params: Params) => {
      let parentServiceId = params['parentServiceId'];

      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];

      if (parentServiceId){
        this._initialServiceSubscription = this.serviceService.getService(parentServiceId).pipe(take(1))
          .subscribe(service => {
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

                  if (total.reviewCount == 0)
                    that._reviewCount.next(-1);
                  else
                    that._reviewCount.next(total.reviewCount);
                }
              }
            );

            // get default service image
            that.getDefaultServiceImage();

            // get review for this service
            that.getServiceReviewsList();
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
                serviceImages[0].url = '../../../assets/defaultThumbnail.jpg';

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
          url: '../../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    });
  }

  getServiceReviewsList (key?: any) {
    if (this._serviceReviewSubscription)
      this._serviceReviewSubscription.unsubscribe();

    this._searchLoading.next(true);

    this._serviceReviewSubscription = this.userServiceReviewService.getAllServiceReviews(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, this.numberItems, key).pipe(
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
                                serviceImages[0].url = '../../../assets/defaultThumbnail.jpg';

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
                            url: '../../../assets/defaultThumbnail.jpg'
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
      this.serviceReviewsArray = _.slice(serviceReviews, 0, this.numberItems);
      this.serviceReviews = of(this.serviceReviewsArray);
      this.nextKey = _.get(serviceReviews[this.numberItems], 'creationDate');
      this._searchLoading.next(false);
    });
  }

  onCreateRateClick($event: ClickEvent, service: Service){
    const newServiceRate: ServiceRate = {
      serviceRateId: '',
      serviceRateServiceId: this.serviceGroup.get('serviceId').value,
      serviceRateServiceUid: this.serviceGroup.get('uid').value,
      serviceId: service.serviceId,
      serviceUid: service.uid,
      rate: $event.rating,
      lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
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

  delete (serviceReview) {
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
    this.prevKeys.push(_.first(this.serviceReviewsArray)['creationDate']);
    this.getServiceReviewsList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServiceReviewsList(prevKey);
  }
}
