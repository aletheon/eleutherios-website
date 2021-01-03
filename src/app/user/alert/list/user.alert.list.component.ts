import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserAlertService,
  UserForumService,
  UserServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumRegistrantService,
  UserForumTagService,
  UserServiceTagService
} from '../../../shared';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'alert-list',
  templateUrl: './user.alert.list.component.html',
  styleUrls: ['./user.alert.list.component.css']
})
export class UserAlertListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public alertGroup: FormGroup;
  public types: string[] = ['All', 'Forum', 'Service'];
  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public alerts: Observable<any[]> = of([]);
  public alertsArray: any[] = [];
  public type: string = 'All';
  public total: Observable<number> = this._total.asObservable();

    private route: ActivatedRoute, 
    private siteTotalService: SiteTotalService,
    private userAlertService: UserAlertService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumTagService: UserForumTagService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder) {
  }

  setViewedAlertFlag(alert) {
    setTimeout(() => {
      if (alert.viewed == false){
        this.userAlertService.update(this.auth.uid, alert.alertId, { viewed: true });
      }
    }, 2000);
  }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackAlerts (index, alert) { return alert.alertId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];

      this.alertGroup = this.fb.group({
        type: ['']
      });
      this.alertGroup.get('type').setValue(this.type);

      // get total
      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.alertCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.alertCount);
          }
          else this._total.next(-1);          
        }
      );
      this.getAlertsList(this.type);
    });
  }

  changeType () {
    this.type = this.alertGroup.get('type').value;
    this.getAlertsList(this.type);
  }

  getAlertsList (type: string, key?: any) {
    if (this._subscription) this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userAlertService.getAlerts(this.auth.uid, type, this.numberItems, key).pipe(
      switchMap(alerts => { // grab the forum or service
        if (alerts && alerts.length > 0){
          let observables = alerts.map(alert => {
            if (alert.type == 'Forum'){
              let getForum$ = this.userForumService.getForum(alert.forumServiceUid, alert.forumServiceId).pipe(
                switchMap(forum => {
                  if (forum) {
                    let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
                    let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.auth.uid).pipe(
                      switchMap(registrants => {
                        if (registrants && registrants.length > 0)
                          return of(registrants[0]);
                        else
                          return of(null);
                      })
                    );
                    let getDefaultForumImage$ = this.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                      switchMap(forumImages => {
                        if (forumImages && forumImages.length > 0){
                          let getDownloadUrl$: Observable<any>;

                          if (forumImages[0].smallUrl)
                            getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].smallUrl).getDownloadURL());

                          return combineLatest([getDownloadUrl$]).pipe(
                            switchMap(results => {
                              const [downloadUrl] = results;
                              
                              if (downloadUrl)
                                forumImages[0].url = downloadUrl;
                              else
                                forumImages[0].url = '../../../assets/defaultThumbnail.jpg';
                
                              return of(forumImages[0]);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );
          
                    return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$]).pipe(
                      switchMap(results => {
                        const [defaultForumImage, forumTags, defaultRegistrant] = results;
          
                        if (defaultForumImage)
                          forum.defaultForumImage = of(defaultForumImage);
                        else {
                          let tempImage = {
                            url: '../../../assets/defaultThumbnail.jpg'
                          };
                          forum.defaultForumImage = of(tempImage);
                        }
  
                        if (forumTags)
                          forum.forumTags = of(forumTags);
                        else
                          forum.forumTags = of([]);

                        if (defaultRegistrant)
                          forum.defaultRegistrant = of(defaultRegistrant);
                        else
                          forum.defaultRegistrant = of(null);
  
                        return of(forum);
                      })
                    );
                  }
                  else return of(null);
                })
              );

              return combineLatest([getForum$]).pipe(
                switchMap(results => {
                  const [forum] = results;
                  
                  if (forum)
                    alert.forum = of(forum);
                  else {
                    alert.forum = of(null);
                  }
                  return of(alert);
                })
              );
            }
            else {
              let getService$ = this.userServiceService.getService(alert.forumServiceUid, alert.forumServiceId).pipe(
                switchMap(service => {
                  if (service) {
                    let getServiceTags$ = this.userServiceTagService.getTags(service.uid, service.serviceId);
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
          
                    return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                      switchMap(results => {
                        const [defaultServiceImage, serviceTags] = results;
          
                        if (defaultServiceImage)
                          service.defaultServiceImage = of(defaultServiceImage);
                        else {
                          let tempImage = {
                            url: '../../../assets/defaultThumbnail.jpg'
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
                })
              );

              return combineLatest([getService$]).pipe(
                switchMap(results => {
                  const [service] = results;
                  
                  if (service)
                    alert.service = of(service);
                  else {
                    alert.service = of(null);
                  }
                  return of(alert);
                })
              );
            }
          });
          return zip(...observables);
        }
        else return of([]);
      })
    )
    .subscribe(alerts => {
      this.alertsArray = _.slice(alerts, 0, this.numberItems);
      this.alerts = of(this.alertsArray);
      this.nextKey = _.get(alerts[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (alert) {
    this.userAlertService.delete(this.auth.uid, alert.alertId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.alertsArray)['creationDate']);
    this.getAlertsList(this.type, this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getAlertsList(this.type, prevKey);
  }
}