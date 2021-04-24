import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserForumService,
  UserServiceImageService,
  UserServiceTagService,
  ServiceService,
  NoTitlePipe,
  TruncatePipe
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'service-image-list',
  templateUrl: './service.image.list.component.html',
  styleUrls: ['./service.image.list.component.css']
})
export class ServiceImageListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription = new Subscription;
  private _initialServiceSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _serviceImagesSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);

  public serviceGroup: FormGroup;
  public service: Observable<any>;
  public serviceTags: Observable<any[]>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public numberOfItems: number = 1;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public serviceImages: Observable<any[]> = of([]);
  public defaultServiceImage: Observable<any>;
  public serviceImagesArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private serviceService: ServiceService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._initialServiceSubscription)
      this._initialServiceSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._serviceImagesSubscription)
      this._serviceImagesSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceImages (index, serviceImage) { return serviceImage.serviceImageId; }
  trackServiceTags (index, serviceTag) { return serviceTag.tagId; }

  ngOnInit () {
    this.nextKey = null;
    this.prevKeys = [];
    this.serviceGroup = this.fb.group({
      serviceId: '',
      uid: ''
    });
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this.route.queryParams.subscribe((params: Params) => {
          let serviceId = params['serviceId'];
          this.serviceGroup.get('serviceId').setValue(params['serviceId']);

          if (serviceId){
            this._initialServiceSubscription = this.serviceService.getService(serviceId).pipe(take(1))
              .subscribe(service => {
                if (service){
                  // authenticate
                  let canViewDetail: boolean = false;

                  this.userForumService.serviceIsServingInUserForumFromPromise(this.loggedInUserId, serviceId)
                    .then(isServing => {
                      if (service.type == 'Public')
                        canViewDetail = true;
                      else if (service.uid == this.loggedInUserId)
                        canViewDetail = true;
                      else if (isServing && isServing == true)
                        canViewDetail = true;

                      if (canViewDetail){
                        this.service = this.serviceService.getService(serviceId);
                        this.initForm();
                      }
                      else {
                        const snackBarRef = this.snackbar.openFromComponent(
                          NotificationSnackBar,
                          {
                            duration: 8000,
                            data: `${service.title} is a private service`,
                            panelClass: ['red-snackbar']
                          }
                        );
                        this.router.navigate(['/']);
                      }
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

    this._serviceSubscription = this.service
      .subscribe(service => {
        if (service){
          this.serviceGroup.patchValue(service);

          if (service.type == 'Private'){
            if (service.uid != this.loggedInUserId){
              this.userForumService.serviceIsServingInUserForumFromPromise(this.loggedInUserId, service.serviceId)
                .then(isServing => {
                  let canViewDetail = false;

                  if (isServing && isServing == true)
                    canViewDetail = true;

                  if (!canViewDetail){
                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: `'${service.title}' is a private service`,
                        panelClass: ['red-snackbar']
                      }
                    );
                    this.router.navigate(['/']);
                  }
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
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              }
            );

            // get default service image
            that.getDefaultServiceImage();

            // get service images
            that.getServiceImagesList();

            // tags for this service
            that.serviceTags = that.userServiceTagService.getTags(service.uid, service.serviceId);
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

  getServiceImagesList (key?: any) {
    if (this._serviceImagesSubscription)
      this._serviceImagesSubscription.unsubscribe();

    this._loading.next(true);

    this._serviceImagesSubscription = this.userServiceImageService.getServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, this.numberOfItems, key).pipe(
      switchMap(serviceImages => {
        if (serviceImages && serviceImages.length > 0){
          let observables = serviceImages.map(serviceImage => {
            if (!serviceImage.largeDownloadUrl)
              serviceImage.largeDownloadUrl = '../../assets/defaultLarge.jpg';

            return of(serviceImage);
          });

          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              return serviceImages[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(serviceImages => {
      this.serviceImagesArray = _.slice(serviceImages, 0, this.numberOfItems);
      this.serviceImages = of(this.serviceImagesArray);
      this.nextKey = _.get(serviceImages[this.numberOfItems], 'creationDate');
      this._loading.next(false);
    });
  }

  getDefaultServiceImage () {
    // default service image
    this._defaultServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value).pipe(
      switchMap(serviceImages => {
        if (serviceImages && serviceImages.length > 0){
          if (!serviceImages[0].smallDownloadUrl)
            serviceImages[0].smallDownloadUrl = '../../assets/defaultThumbnail.jpg';

          return of(serviceImages[0]);
        }
        else return of(null);
      })
    )
    .subscribe(serviceImage => {
      if (serviceImage)
        this.defaultServiceImage = of(serviceImage);
      else {
        let tempImage = {
          smallDownloadUrl: '../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    })
  }

  onNext () {
    this.prevKeys.push(_.first(this.serviceImagesArray)['creationDate']);
    this.getServiceImagesList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServiceImagesList(prevKey);
  }
}
