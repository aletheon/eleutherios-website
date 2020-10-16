import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  AnonymousServiceService,
  UserServiceImageService,
  UserServiceTagService,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'anonymous-service-image-list',
  templateUrl: './anonymous.service.image.list.component.html',
  styleUrls: ['./anonymous.service.image.list.component.css']
})
export class AnonymousServiceImageListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _serviceImagesSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
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
  public serviceUid: string;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private anonymousServiceService: AnonymousServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceImages (index, serviceImage) { return serviceImage.serviceImageId; }
  trackServiceTags (index, tag) { return tag.tagId; }

  ngOnInit () {
    // redirect user if they are already logged in
    if (this.auth.uid && this.auth.uid.length > 0)
      this.router.navigate(['/']);

    this.nextKey = null;
    this.prevKeys = [];
    this.serviceGroup = this.fb.group({
      serviceId: '',
      uid: ''
    });
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      if (params['serviceId'] && params['serviceId'].length > 0){
        this.serviceGroup.get('serviceId').setValue(params['serviceId']);

        // ensure service exists
        this.anonymousServiceService.getServiceFromPromise(this.serviceGroup.get('serviceId').value)
          .then(service => {
            if (service){
              this.service = this.anonymousServiceService.getService(this.serviceGroup.get('serviceId').value);
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
              this.router.navigate(['/anonymous/home']);
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
          this.router.navigate(['/anonymous/home']);
        });
      }
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'There was no serviceId provided',
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/anonymous/home']);
      }
    });
  }

  private initForm (){
    const that = this;

    this._subscription = this.service
      .subscribe(service => {
        if (service)
          this.serviceGroup.patchValue(service);
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'The service no longer exists or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/anonymous/home']);
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
                if (total){
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
            let getDownloadUrl$: Observable<any>;

            if (serviceImage.largeUrl)
              getDownloadUrl$ = from(firebase.storage().ref(serviceImage.largeUrl).getDownloadURL());

            return combineLatest([getDownloadUrl$]).pipe(
              switchMap(results => {
                const [downloadUrl] = results;
                
                if (downloadUrl)
                  serviceImage.url = downloadUrl;
                else
                  serviceImage.url = '../../../../assets/defaultLarge.jpg';
  
                return of(serviceImage);
              })
            );
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
          let getDownloadUrl$: Observable<any>;

          if (serviceImages[0].smallUrl)
            getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].smallUrl).getDownloadURL());

          return combineLatest([getDownloadUrl$]).pipe(
            switchMap(results => {
              const [downloadUrl] = results;
              
              if (downloadUrl)
                serviceImages[0].url = downloadUrl;
              else
                serviceImages[0].url = '../../../../assets/defaultThumbnail.jpg';

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
          url: '../../../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    });
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