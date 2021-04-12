import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { Location } from '@angular/common';
import { MatExpansionPanel } from '@angular/material/expansion';
import {
  AnonymousServiceService,
  UserServiceImageService,
  UserServiceTagService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';
import { environment } from '../../../../environments/environment'

import { Observable, Subscription, BehaviorSubject, of, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'anonymous-service-detail',
  templateUrl: './anonymous.service.detail.component.html',
  styleUrls: ['./anonymous.service.detail.component.css']
})
export class AnonymousServiceDetailComponent implements OnInit, OnDestroy  {
  @ViewChild('descriptionPanel', { static: false }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: false }) _descriptionPanelTitle: ElementRef;

  private _loading = new BehaviorSubject(false);
  private _initialServiceSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;

  public service: Observable<any>;
  public serviceGroup: FormGroup;
  public serviceTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();
  public defaultServiceImage: Observable<any>;

  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private anonymousServiceService: AnonymousServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar,
    private title: Title,
    private meta: Meta,
    private location: Location) {
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else
      this._descriptionPanelTitle.nativeElement.style.display = "block";
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
      if (serviceImage){
        this.defaultServiceImage = of(serviceImage);
        this.meta.updateTag({ property: 'og:image', content: serviceImage.url });
      }
      else {
        let tempImage = {
          url: '../../../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
        this.meta.updateTag({ property: 'og:image', content: `${environment.url}assets/defaultLarge.jpg` });
        this.meta.updateTag({ property: 'og:image:width', content: '249' });
        this.meta.updateTag({ property: 'og:image:height', content: '174' });
      }
    });
  }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();
  }

  trackServiceTags (index, serviceTag) { return serviceTag.tagId; }

  ngOnInit () {
    // redirect user if they are already logged in
    if (this.auth.uid && this.auth.uid.length > 0)
      this.router.navigate(['/']);

    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let serviceId = params['serviceId'];

      if (serviceId){
        // redirect user if they are already logged in
        if (this.auth.uid && this.auth.uid.length > 0){
          this.router.navigate(['/service/detail'], { queryParams: { serviceId: serviceId } });
        }

        this._initialServiceSubscription = this.anonymousServiceService.getService(serviceId).subscribe(service => {
          this._initialServiceSubscription.unsubscribe();

          if (service){
            this.service = this.anonymousServiceService.getService(serviceId);
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
        this.router.navigate(['/anonymous/home']);
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
        if (service){
          this.serviceGroup.patchValue(service);
        }
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
            that.title.setTitle(service.title);
            that.meta.updateTag({ property: 'og:title', content: service.title });
            that.meta.updateTag({ property: 'og:description', content: service.description });
            that.meta.updateTag({ property: 'og:url', content: `${environment.url}anonymous/service/detail?serviceId=${service.serviceId}` });

            // tags for this service
            that.serviceTags = that.userServiceTagService.getTags(service.uid, service.serviceId);

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
}
