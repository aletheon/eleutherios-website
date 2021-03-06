import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import {
  UserService,
  AnonymousForumService,
  AnonymousServiceService,
  UserForumService,
  UserServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumTagService,
  UserServiceTagService,
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-profile',
  templateUrl: './user.profile.component.html',
  styleUrls: ['./user.profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  private _usernameSubscription: Subscription;

  public user: Observable<any>;
  public publicForums: Observable<any[]>;
  public publicServices: Observable<any[]>;
  public publicForumsNumberOfItems: number = 100;
  public publicServicesNumberOfItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private anonymousForumService: AnonymousForumService,
    private anonymousServiceService: AnonymousServiceService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumTagService: UserForumTagService,
    private userServiceTagService: UserServiceTagService,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._usernameSubscription)
      this._usernameSubscription.unsubscribe();
  }

  trackPublicForums (index, forum) { return forum.forumId; }
  trackPublicServices (index, service) { return service.serviceId; }

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
              data: `Forum with forumId ${forum.forumId} does not exist or was removed`,
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

  deleteForum (forum) {
    this.userForumService.delete(forum.uid, forum.forumId);
  }

  deleteService (service) {
    this.userServiceService.delete(service.uid, service.serviceId);
  }

  createNewService(forum) {
    window.localStorage.setItem('serviceForum', JSON.stringify(forum));
    this.router.navigate(['/user/service/new']);
  }

  indexDeindexForum (forum){
    this.userForumService.getForumFromPromise(forum.uid, forum.forumId)
      .then(fetchedForum => {
        if (fetchedForum){
          fetchedForum.indexed = !fetchedForum.indexed;
          this.userForumService.update(fetchedForum.uid, fetchedForum.forumId, fetchedForum);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Forum with forumId ${forum.forumId} does not exist or was removed`,
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

  async ngOnInit () {
    this._loading.next(true);

    let username = this.router.url.substring(this.router.url.lastIndexOf('/') + 1);

    if (username && username.length > 0){
      this._usernameSubscription = this.userService.getUserByUsername(username).pipe(take(1)).subscribe(user => {
        if (user){
          this._usernameSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
            if (user)
              this.loggedInUserId = user.uid;

            this.user = this.userService.getUserByUsername(username);
            this.initForm();
          });
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `User with username ${username} was not found`,
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      });
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: `Username was not provided`,
          panelClass: ['red-snackbar']
        }
      );
      this.router.navigate(['/']);
    }
  }

  private initForm () {
    const that = this;

    // run once subscription
    const runOnceSubscription = this.user.subscribe(user => {
      if (user){
        let load = async function(){
          try {
            // public forums
            that.publicForums = that.anonymousForumService.getUserForums(user.uid, that.publicForumsNumberOfItems, '', [], true, true).pipe(
              switchMap(forums => {
                if (forums && forums.length > 0){
                  let observables = forums.map(forum => {
                    if (forum){
                      let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                        switchMap(forumImages => {
                          if (forumImages && forumImages.length > 0){
                            if (!forumImages[0].smallDownloadUrl)
                              forumImages[0].smallDownloadUrl = '../../../assets/defaultThumbnail.jpg';

                            return of(forumImages[0]);
                          }
                          else return of(null);
                        })
                      );
                      let getForumTags$ = that.userForumTagService.getTags(forum.uid, forum.forumId);

                      return combineLatest([getDefaultForumImage$, getForumTags$]).pipe(
                        switchMap(results => {
                          const [defaultForumImage, forumTags] = results;

                          if (defaultForumImage)
                            forum.defaultForumImage = of(defaultForumImage);
                          else {
                            let tempImage = {
                              smallDownloadUrl: '../../../assets/defaultThumbnail.jpg'
                            };
                            forum.defaultForumImage = of(tempImage);
                          }

                          if (forumTags)
                            forum.forumTags = of(forumTags);
                          else
                            forum.forumTags = of([]);

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
            that.publicServices = that.anonymousServiceService.getUserServices(user.uid, that.publicServicesNumberOfItems, '', [], true, true).pipe(
              switchMap(services => {
                if (services && services.length > 0){
                  let observables = services.map(service => {
                    if (service){
                      let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                        switchMap(serviceImages => {
                          if (serviceImages && serviceImages.length > 0){
                            if (!serviceImages[0].smallDownloadUrl)
                              serviceImages[0].smallDownloadUrl = '../../../assets/defaultThumbnail.jpg';

                            return of(serviceImages[0]);
                          }
                          else return of(null);
                        })
                      );
                      let getServiceTags$ = that.userServiceTagService.getTags(service.uid, service.serviceId);

                      return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                        switchMap(results => {
                          const [defaultServiceImage, serviceTags] = results;

                          if (defaultServiceImage)
                            service.defaultServiceImage = of(defaultServiceImage);
                          else {
                            let tempImage = {
                              smallDownloadUrl: '../../../assets/defaultThumbnail.jpg',
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

                  return zip(...observables, (...results: any[]) => {
                    return results.map((result, i) => {
                      return services[i];
                    });
                  });
                }
                else return of([]);
              })
            );
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
}
