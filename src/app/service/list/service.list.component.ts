import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import {
  SiteTotalService,
  UserService,
  UserServiceService,
  UserServiceImageService,
  UserServiceTagService,
  ServiceService,
  TagService,
  Tag,
  NoTitlePipe
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'service-list',
  templateUrl: './service.list.component.html',
  styleUrls: ['./service.list.component.css']
})
export class ServiceListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription: Subscription;
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _siteTotalSubscription: Subscription;
  private _serviceSearchSubscription: Subscription;
  private _tempSearchTags: string[] = [];

  public serviceGroup: FormGroup;
  public searchServiceCtrl: FormControl;
  public serviceSearchTagCtrl: FormControl;
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public paymentTypes: string[] = ['Any', 'Free', 'Payment'];
  public currencies: string[] = ['AUD', 'BRL', 'GBP', 'BGN', 'CAD', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'RON', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'];
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteSearchTags: Observable<any[]>;
  public services: Observable<any[]> = of([]);
  public servicesArray: any[] = [];
  public searchTags: Tag[]= [];
  public total: Observable<number> = this._total.asObservable();
  public includeTagsInSearch: boolean;
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userService: UserService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private serviceService: ServiceService,
    private tagService: TagService,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private router: Router) {
      this.searchServiceCtrl = new FormControl();
      this.serviceSearchTagCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteSearchTags = this.serviceSearchTagCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm =>
          this.tagService.search(searchTerm)
        )
      );
    }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._siteTotalSubscription)
      this._siteTotalSubscription.unsubscribe();

    if (this._serviceSearchSubscription)
      this._serviceSearchSubscription.unsubscribe();
  }

  trackSearchTags (index, tag) { return tag.tagId; }
  trackServices (index, service) { return service.serviceId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];
      this.includeTagsInSearch = true;

      this.serviceGroup = this.fb.group({
        includeTagsInSearch:  [''],
        paymentType:          [''],
        currency:             [''],
        startAmount:          ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0), Validators.max(999999.99)]],
        endAmount:            ['', [Validators.required, Validators.pattern(/^\s*-?\d+(\.\d{1,2})?\s*$/), Validators.min(0), Validators.max(999999.99)]],
      });
      this.serviceGroup.get('includeTagsInSearch').setValue(this.includeTagsInSearch);
      this.serviceGroup.get('paymentType').setValue('Any');
      this.serviceGroup.get('currency').setValue('NZD');
      this.serviceGroup.get('startAmount').setValue(1);
      this.serviceGroup.get('endAmount').setValue(10);

      this._totalSubscription = this.siteTotalService.getTotal('service')
        .subscribe(total => {
          if (total){
            if (total.count == 0)
              this._total.next(-1);
            else
              this._total.next(total.count);
          }
        }
      );

      this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
        if (user){
          this.loggedInUserId = user.uid;

          this._serviceSearchSubscription = this.searchServiceCtrl.valueChanges.pipe(
            startWith('')
          )
          .subscribe(searchTerm => {
            this.getServicesList(searchTerm);
          });
        }
      });
    });
  }

  getServicesList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    if (this.searchServiceCtrl.value && this.searchServiceCtrl.value.length > 0){
      if (!key)
        key = this.searchServiceCtrl.value;

      this._subscription = this.serviceService.getServicesSearchTerm(this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch, false, this.serviceGroup.get('paymentType').value, this.serviceGroup.get('currency').value, this.serviceGroup.get('startAmount').value, this.serviceGroup.get('endAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
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
                            serviceImages[0].url = '../../assets/defaultThumbnail.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;

                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../assets/defaultThumbnail.jpg'
                      };
                      service.defaultServiceImage = of(tempImage);
                    }

                    if (serviceTags)
                      service.serviceTags = of(serviceTags);
                    else
                      service.serviceTags = of([]);

                    return of(service);
                  })
                );
              }
              else return of(null);
            });

            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(services => {
        this.servicesArray = _.slice(services, 0, this.numberItems);
        this.services = of(this.servicesArray);
        this.nextKey = _.get(services[this.numberItems], 'title');
        this._loading.next(false);
      });
    }
    else {
      this._subscription = this.serviceService.getAllServices(this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch, false, this.serviceGroup.get('paymentType').value, this.serviceGroup.get('currency').value, this.serviceGroup.get('startAmount').value, this.serviceGroup.get('endAmount').value).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
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
                            serviceImages[0].url = '../../assets/defaultThumbnail.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );

                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);

                return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImage, serviceTags] = results;

                    if (defaultServiceImage)
                      service.defaultServiceImage = of(defaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../assets/defaultThumbnail.jpg'
                      };
                      service.defaultServiceImage = of(tempImage);
                    }

                    if (serviceTags)
                      service.serviceTags = of(serviceTags);
                    else
                      service.serviceTags = of([]);

                    return of(service);
                  })
                );
              }
              else return of(null);
            });

            return zip(...observables, (...results) => {
              return results.map((result, i) => {
                return services[i];
              });
            });
          }
          else return of([]);
        })
      )
      .subscribe(services => {
        this.servicesArray = _.slice(services, 0, this.numberItems);
        this.services = of(this.servicesArray);
        this.nextKey = _.get(services[this.numberItems], 'creationDate');
        this._loading.next(false);
      });
    }
  }

  includeTagsInSearchClick () {
    this.includeTagsInSearch = this.serviceGroup.get('includeTagsInSearch').value;
    this.getServicesList();
  }

  removeSearchTag (tag) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    if (tagIndex > -1) {
      this.searchTags.splice(tagIndex, 1);
      this.searchTags.sort();
      this._tempSearchTags.splice(tagIndex, 1);
      this.getServicesList();
    }
  }

  autoSearchTagDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  searchTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    // tag doesn't exist so add it
    if (tagIndex == -1){
      this.searchTags.push(tag);
      this._tempSearchTags.push(tag.tag);
      this.searchTags.sort();
      this._tempSearchTags.sort();
      this.getServicesList();
    }
  }

  delete (service) {
    this.userServiceService.delete(service.uid, service.serviceId);
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
              data: `Service with serviceId ${service.serviceId} does not exist or was removed`,
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
              data: `Service with serviceId ${service.serviceId} does not exist or was removed`,
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

  onNext () {
    if (this.searchServiceCtrl.value && this.searchServiceCtrl.value.length > 0)
      this.prevKeys.push(_.first(this.servicesArray)['title']);
    else
      this.prevKeys.push(_.first(this.servicesArray)['creationDate']);

    this.getServicesList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServicesList(prevKey);
  }
}
