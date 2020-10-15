import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  UserServiceService,
  UserForumService,
  UserAlertService,
  UserServiceImageService,
  UserForumImageService,
  UserForumTagService,
  UserServiceTagService,
  UserForumRegistrantService,
  ForumService,
  ServiceService,
  AppearDirective,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../shared';

import { NotificationSnackBar } from '../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy, OnInit {
  private _loading = new BehaviorSubject(false);
  private _alertSubscription: Subscription;

  public publicForums: Observable<any[]>;
  public publicServices: Observable<any[]>;
  public privateForums: Observable<any[]>;
  public privateServices: Observable<any[]>;
  public alerts: Observable<any[]>;
  public publicForumsNumberOfItems: number = 100;
  public publicServicesNumberOfItems: number = 100;
  public privateForumsNumberOfItems: number = 100;
  public privateServicesNumberOfItems: number = 100;
  public alertsNumberOfItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userAlertService: UserAlertService,
    private userServiceImageService: UserServiceImageService,
    private userForumImageService: UserForumImageService,
    private userForumTagService: UserForumTagService,    
    private userServiceTagService: UserServiceTagService,    
    private userForumRegistrantService: UserForumRegistrantService,
    private forumService: ForumService,
    private serviceService: ServiceService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  setViewedAlertFlag(alert) {
    setTimeout(() => {
      if (alert.viewed == false){
        this.userAlertService.update(this.auth.uid, alert.alertId, { viewed: true });
      }
    }, 2000);
  }

  changeForumType (forum) {
    this.userForumService.getForumFromPromise(forum.uid, forum.forumId)
      .then(fetchedForum => {
        if (fetchedForum){
          if (fetchedForum.type == 'Public')
            fetchedForum.type = 'Private';
          else
            fetchedForum.type = 'Public';

          this.userForumService.update(fetchedForum.uid, fetchedForum.forumId, fetchedForum);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Forum with forumId ${forum.forumId} was removed or does not exist`,
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

  changeServiceType (service) {
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

  delete (alert) {
    this.userAlertService.delete(this.auth.uid, alert.alertId);
  }

  deleteForum (forum) {
    this.userForumService.delete(forum.uid, forum.forumId);
  }

  deleteService (service) {
    this.userServiceService.delete(service.uid, service.serviceId);
  }

  ngOnDestroy () {
    if (this._alertSubscription)
      this._alertSubscription.unsubscribe();
  }

  trackPrivateServices (index, service) { return service.serviceId; }
  trackPublicForums (index, forum) { return forum.forumId; }
  trackPublicServices (index, service) { return service.serviceId; }
  trackAlerts (index, alert) { return alert.alertId; }
  trackPrivateForums (index, forum) { return forum.forumId; }

  ngOnInit () {
    const that = this;
    this._loading.next(true);
    let load = async function(){
      try {
        // public forums
        that.publicForums = that.forumService.getForums(that.publicForumsNumberOfItems, '', [], true, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
                  let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                    switchMap(forumImages => {
                      if (forumImages && forumImages.length > 0)
                        return of(forumImages[0]);
                      else
                        return of(null);
                    })
                  );

                  let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          tinyUrl: '../../assets/defaultTiny.jpg',
                          name: 'No image'
                        };
                        forum.defaultForumImage = of(tempImage);
                      }

                      if (defaultRegistrant)
                        forum.defaultRegistrant = of(defaultRegistrant);
                      else
                        forum.defaultRegistrant = of(null);

                      return of(forum);
                    })
                  );
                }
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return forums[i];
                });
              });
            }
            else return of([]);
          })
        );

        // public services
        that.publicServices = that.serviceService.getServices(that.publicServicesNumberOfItems, '', [], true, true).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0)
                        return of(serviceImages[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultServiceImage$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          tinyUrl: '../../assets/defaultTiny.jpg',
                          name: 'No image'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }
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
        );

        // private forums
        that.privateForums = that.userForumService.getForums(that.auth.uid, that.privateForumsNumberOfItems, '', [], true, false).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
                  let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                    switchMap(forumImages => {
                      if (forumImages && forumImages.length > 0)
                        return of(forumImages[0]);
                      else
                        return of(null);
                    })
                  );

                  let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(

                  );
                }
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return forums[i];
                });
              });
            }
            else return of([]);
          })
        );

        // private services
        that.privateServices = that.userServiceService.getServices(that.auth.uid, that.privateServicesNumberOfItems, '', [], true, false).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0)
                        return of(serviceImages[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultServiceImage$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage] = results;
        
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          tinyUrl: '../../assets/defaultTiny.jpg',
                          name: 'No image'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }
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
        );

        // alerts
        that._alertSubscription = that.userAlertService.getAlerts(that.auth.uid, 'All', that.alertsNumberOfItems, '').pipe(
          switchMap(alerts => { // grab the forum or service
            if (alerts && alerts.length > 0){
              let observables = alerts.map(alert => {
                if (alert.type == 'Forum'){
                  return that.userForumService.getForum(alert.forumServiceUid, alert.forumServiceId).pipe(
                    switchMap(forum => {
                      if (forum){
                        let getForumTags$ = that.userForumTagService.getTags(forum.uid, forum.forumId);
                        let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                          switchMap(forumImages => {
                            if (forumImages && forumImages.length > 0)
                              return of(forumImages[0]);
                            else
                              return of(null);
                          })
                        );

                        let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                          switchMap(registrants => {
                            if (registrants && registrants.length > 0)
                              return of(registrants[0]);
                            else
                              return of(null);
                          })
                        );

                        return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$]).pipe(
                          switchMap(results => {
                            const [defaultForumImage, forumTags, defaultRegistrant] = results;
              
                            if (defaultForumImage)
                              forum.defaultForumImage = of(defaultForumImage);
                            else {
                              let tempImage = {
                                smallUrl: '../../assets/defaultThumbnail.jpg',
                                name: 'No image'
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
                }
                else {
                  return that.userServiceService.getService(alert.forumServiceUid, alert.forumServiceId).pipe(
                    switchMap(service => {
                      if (service){
                        let getServiceTags$ = that.userServiceTagService.getTags(service.uid, service.serviceId);
                        let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                          switchMap(serviceImages => {
                            if (serviceImages && serviceImages.length > 0)
                              return of(serviceImages[0]);
                            else
                              return of(null);
                          })
                        );

                        return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                          switchMap(results => {
                            const [defaultServiceImage, serviceTags] = results;
              
                            if (defaultServiceImage)
                              service.defaultServiceImage = of(defaultServiceImage);
                            else {
                              let tempImage = {
                                smallUrl: '../../assets/defaultThumbnail.jpg',
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
                    })
                  );
                }
              });

              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  if (alerts[i].type == 'Forum')
                    alerts[i].forum = of(result);
                  else
                    alerts[i].service = of(result);
                  
                  return alerts[i];
                });
              });
            }
            else return of([]);
          })
        )
        .subscribe(alerts => {
          if (alerts && alerts.length > 0)
            that.alerts = of(alerts);
          else
            that.alerts = of([]);
        });
      }
      catch (error) {
        throw error;
      }
    }

    // call load
    load().then(() => {
      this._loading.next(false);
    })
    .catch((error) =>{
      console.log('initForm ' + error);
      this.router.navigate(['/login']);
    });
  }
}