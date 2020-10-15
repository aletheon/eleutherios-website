import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserServiceService,
  UserServiceImageService,
  UserServiceTagService,
  TagService,
  Tag,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-service-list',
  templateUrl: './user.service.list.component.html',
  styleUrls: ['./user.service.list.component.css']
})
export class UserServiceListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
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
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteSearchTags: Observable<any[]>;
  public services: Observable<any[]> = of([]);
  public servicesArray: any[] = [];
  public searchTags: Tag[]= [];
  public total: Observable<number> = this._total.asObservable();
  public includeTagsInSearch: boolean;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private tagService: TagService,
    private snackbar: MatSnackBar,
    private fb: FormBuilder,
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

      this._serviceSearchSubscription = this.searchServiceCtrl.valueChanges.pipe(
        startWith('')
      )
      .subscribe(searchTerm => {
        this.getServicesList(searchTerm);
      });
    }

  ngOnDestroy () {
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
    this.nextKey = null;
    this.prevKeys = [];
    this.includeTagsInSearch = true;
    this.serviceGroup = this.fb.group({
      includeTagsInSearch: ['']
    });
    this.serviceGroup.get('includeTagsInSearch').setValue(this.includeTagsInSearch);

    this._siteTotalSubscription = this.siteTotalService.getTotal(this.auth.uid)
      .subscribe(total => {
        if (total){
          if (total.serviceCount == 0)
            this._total.next(-1);
          else
            this._total.next(total.serviceCount);
        }
      }
    );
    this.getServicesList();
  }

  getServicesList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();
    
    // loading
    this._loading.next(true);

    if (this.searchServiceCtrl.value && this.searchServiceCtrl.value.length > 0){
      if (!key)
        key = this.searchServiceCtrl.value;

      this._subscription = this.userServiceService.getServicesSearchTerm(this.auth.uid, this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch, false).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                // need to be private calls for image and tags rob
                let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);
      
                return combineLatest([getDefaultServiceImages$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImages, serviceTags] = results;
                            
                    if (defaultServiceImages && defaultServiceImages.length > 0)
                      service.defaultServiceImage = of(defaultServiceImages[0]);
                    else {
                      let tempImage = {
                        smallUrl: '../../../assets/defaultThumbnail.jpg',
                        name: 'No image'
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
      this._subscription = this.userServiceService.getAllServices(this.auth.uid, this.numberItems, key, this._tempSearchTags, this.includeTagsInSearch, false).pipe(
        switchMap(services => {
          if (services && services.length > 0){
            let observables = services.map(service => {
              if (service){
                let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);
      
                return combineLatest([getDefaultServiceImages$, getServiceTags$]).pipe(
                  switchMap(results => {
                    const [defaultServiceImages, serviceTags] = results;
                            
                    if (defaultServiceImages && defaultServiceImages.length > 0)
                      service.defaultServiceImage = of(defaultServiceImages[0]);
                    else {
                      let tempImage = {
                        smallUrl: '../../../assets/defaultThumbnail.jpg',
                        name: 'No image'
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
              data: `Service with serviceId ${service.serviceId} was removed or does not exist`,
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
              data: `Service with serviceId ${service.serviceId} was removed or does not exist`,
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

  // onDomChange($event: Event): void {
  //   console.log($event);
  // }
}