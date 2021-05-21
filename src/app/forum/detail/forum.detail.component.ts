import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { Location } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionPanel } from '@angular/material/expansion';

import {
  SiteTotalService,
  UserActivityService,
  UserForumService,
  UserForumRegistrantService,
  UserServiceBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserServiceForumBlockService,
  UserForumUserBlockService,
  UserServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumTagService,
  ForumService,
  Registrant,
  ServiceBlock,
  ServiceUserBlock,
  NoTitlePipe
} from '../../shared';

import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, combineLatest, of, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'forum-detail',
  templateUrl: './forum.detail.component.html',
  styleUrls: ['./forum.detail.component.css']
})
export class ForumDetailComponent implements OnInit, OnDestroy {
  @ViewChild('descriptionPanel', { static: false }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: false }) _descriptionPanelTitle: ElementRef;

  private _loading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  private _initialForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _registrantCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _postCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);

  public defaultRegistrant: Observable<any>;
  public forum: Observable<any>;
  public registrantCount: Observable<number> = this._registrantCount.asObservable();
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public postCount: Observable<number> = this._postCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public forumGroup: FormGroup;
  public registrants: Observable<any[]>;
  public userServices: Observable<any[]>;
  public forumTags: Observable<any[]>;
  public numberItems: number = 100;
  public id: Observable<string>;
  public returnUserId: Observable<string>;
  public returnType: Observable<string> = of('');
  public userServicesCtrl: FormControl;
  public loading: Observable<boolean> = this._loading.asObservable();
  public blockTypes: string[] = ['Remove', 'Block Service', 'Block User'];
  public defaultForumImage: Observable<any>;
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumService: UserForumService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userServiceBlockService: UserServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumTagService: UserForumTagService,
    private forumService: ForumService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar,
    private location: Location) {
      this.userServicesCtrl = new FormControl();
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else
      this._descriptionPanelTitle.nativeElement.style.display = "block";
  }

  changeType () {
    this.userForumService.getForumFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value)
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
              data: `Forum with forumId ${this.forumGroup.get('forumId').value} does not exist or was removed`,
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

  indexDeindexForum (){
    this.userForumService.getForumFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value)
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
              data: `Forum with forumId ${this.forumGroup.get('forumId').value} does not exist or was removed`,
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

  delete () {
    this.userForumService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value).then(() => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 5000,
          data: 'Forum was successfully removed',
          panelClass: ['green-snackbar']
        }
      );
      this.router.navigate(['/']);
    })
    .catch(error => {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: error,
          panelClass: ['red-snackbar']
        }
      );
      this.router.navigate(['/']);
    });
  }

  addService () {
    if (this.forumGroup.get('title').value.length > 0){
      if (this.userServicesCtrl.value.title.length > 0){
        this.userForumServiceBlockService.serviceIsBlocked(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.userServicesCtrl.value.serviceId)
          .then(serviceBlocked => {
            if (!serviceBlocked) {
              this.userServiceUserBlockService.userIsBlocked(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.userServicesCtrl.value.uid)
                .then(serviceUserBlocked => {
                  if (!serviceUserBlocked) {
                    this.userServiceForumBlockService.forumIsBlocked(this.userServicesCtrl.value.uid, this.userServicesCtrl.value.serviceId, this.forumGroup.get('forumId').value)
                      .then(forumBlocked => {
                        if (!forumBlocked) {
                          this.userForumUserBlockService.userIsBlocked(this.userServicesCtrl.value.uid, this.userServicesCtrl.value.serviceId, this.forumGroup.get('uid').value)
                            .then(forumUserBlocked => {
                              if (!forumUserBlocked) {
                                this.userForumRegistrantService.serviceIsServingInForumFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.userServicesCtrl.value.serviceId)
                                  .then(isServing => {
                                    if (!isServing) {
                                      const newRegistrant: Registrant = {
                                        registrantId: '',
                                        parentId: '',
                                        serviceId: this.userServicesCtrl.value.serviceId,
                                        uid: this.userServicesCtrl.value.uid,
                                        forumId: this.forumGroup.get('forumId').value,
                                        forumUid: this.forumGroup.get('uid').value,
                                        default: false,
                                        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                                        creationDate: firebase.firestore.FieldValue.serverTimestamp()
                                      };

                                      this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.userServicesCtrl.value.uid)
                                        .then(registrant => {
                                          if (registrant == null)
                                            newRegistrant.default = true;

                                          this.userForumRegistrantService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, newRegistrant).then(() => {
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
                                      )
                                      .catch(error => {
                                        console.error(error);
                                      });
                                    }
                                    else {
                                      const snackBarRef = this.snackbar.openFromComponent(
                                        NotificationSnackBar,
                                        {
                                          duration: 8000,
                                          data: `'${this.userServicesCtrl.value.title}' is already serving in the forum '${this.forumGroup.get('title').value}'`,
                                          panelClass: ['red-snackbar']
                                        }
                                      );
                                    }
                                  })
                                  .catch((error) => {
                                    console.log("error adding service to forum " + JSON.stringify(error));
                                  }
                                );
                              }
                              else {
                                const snackBarRef = this.snackbar.openFromComponent(
                                  NotificationSnackBar,
                                  {
                                    duration: 8000,
                                    data: `The user of the forum '${this.forumGroup.get('title').value}' has been blocked from requesting the service '${this.userServicesCtrl.value.title}'`,
                                    panelClass: ['red-snackbar']
                                  }
                                );
                              }
                            }
                          );
                        }
                        else {
                          const snackBarRef = this.snackbar.openFromComponent(
                            NotificationSnackBar,
                            {
                              duration: 8000,
                              data: `The forum '${this.forumGroup.get('title').value}' has been blocked from requesting the service '${this.userServicesCtrl.value.title}'`,
                              panelClass: ['red-snackbar']
                            }
                          );
                        }
                      }
                    );
                  }
                  else {
                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: `The user of the service '${this.userServicesCtrl.value.title}' has been blocked from serving in the forum '${this.forumGroup.get('title').value}'`,
                        panelClass: ['red-snackbar']
                      }
                    );
                  }
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
                }
              );
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `The service '${this.userServicesCtrl.value.title}' has been blocked from serving in the forum '${this.forumGroup.get('title').value}'`,
                  panelClass: ['red-snackbar']
                }
              );
            }
          }
        );
      }
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: `Service is missing a title`,
            panelClass: ['red-snackbar']
          }
        );
      }
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: `Forum is missing a title`,
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  blockRegistrant (event, registrant) {
    if (event.value == 'Remove'){
      this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
        this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
      })
      .catch(error => {
        console.error(error);
      });
    }
    else if (event.value == 'Block Service'){
      const serviceBlock: ServiceBlock = {
        serviceBlockId: '',
        serviceId: registrant.serviceId,
        serviceUid: registrant.uid,
        forumId: this.forumGroup.get('forumId').value,
        forumUid: this.forumGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userServiceBlockService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId, serviceBlock);
    }
    else { // Block User
      const serviceUserBlock: ServiceUserBlock = {
        serviceUserBlockId: '',
        userId: registrant.uid,
        serviceId: registrant.serviceId,
        forumId: this.forumGroup.get('forumId').value,
        forumUid: this.forumGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userServiceUserBlockService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.uid, serviceUserBlock);
    }
  }

  removeRegistrant (registrant) {
    this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
      this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
    })
    .catch(error => {
      console.error(error);
    });
  }

  getDefaultForumImage () {
    this._defaultForumImageSubscription = this.userForumImageService.getDefaultForumImages(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value).pipe(
      switchMap(forumImages => {
        if (forumImages && forumImages.length > 0){
          if (!forumImages[0].smallDownloadUrl)
            forumImages[0].smallDownloadUrl = '../../assets/defaultThumbnail.jpg';

          return of(forumImages[0]);
        }
        else return of(null);
      })
    )
    .subscribe(forumImage => {
      if (forumImage)
        this.defaultForumImage = of(forumImage);
      else {
        let tempImage = {
          smallDownloadUrl: '../../assets/defaultThumbnail.jpg'
        };
        this.defaultForumImage = of(tempImage);
      }
    });
  }

  createNewService(forum) {
    window.localStorage.setItem('serviceForum', JSON.stringify(forum));
    this.router.navigate(['/user/service/new']);
  }

  trackForumTags (index, forumTag) { return forumTag.tagId; }

  trackRegistrants (index, registrant) { return registrant.registrantId; }

  trackUserServices (index, service) { return service.serviceId; }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._initialForumSubscription)
      this._initialForumSubscription.unsubscribe();

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();
  }

  ngOnInit () {
    // get params
    const that = this;

    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this.route.queryParams.subscribe((params: Params) => {
          let forumId = params['forumId'] ? params['forumId'] : '';
          let serviceId = params['serviceId'] ? params['serviceId'] : '';
          let serviceUserId = params['serviceUserId'] ? params['serviceUserId'] : '';
          let parentForumId = params['parentForumId'] ? params['parentForumId'] : '';
          let parentForumUserId = params['forumUserId'] ? params['forumUserId'] : '';

          if (serviceId.length > 0 || parentForumId.length > 0){
            if (serviceId){
              this.id = of(serviceId);
              this.returnUserId = of(serviceUserId);
              this.returnType = of('Service');
            }
            else if (parentForumId) {
              this.id = of(parentForumId);
              this.returnUserId = of(parentForumUserId);
              this.returnType = of('Forum');
            }
          }

          if (forumId.length > 0){
            this._initialForumSubscription = this.forumService.getForum(forumId).pipe(take(1)).subscribe(forum => {
              if (forum){
                this.forum = this.forumService.getForum(forumId);
                this.initForm();
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: 'Forum does not exist or was recently removed',
                    panelClass: ['red-snackbar']
                  }
                );
                this.router.navigate(['/']);
              }
            });
          }
          else {
            const snackBarRef = that.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'There was no forumId supplied',
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

    this.forumGroup = this.fb.group({
      forumId:                            [''],
      parentId:                           [''],
      parentUid:                          [''],
      uid:                                [''],
      type:                               [''],
      title:                              [''],
      title_lowercase:                    [''],
      description:                        [''],
      website:                            [''],
      indexed:                            [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      searchPrivateServices:              [''],
      searchServiceIncludeTagsInSearch:   [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });

    //  ongoing subscription
    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum)
          this.forumGroup.patchValue(forum);
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Forum does not exist or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      }
    );

    // run once subscription
    const runOnceSubscription = this.forum.subscribe(forum => {
      if (forum){
        let load = async function(){
          try {
            // listen when description panel is ready, then open
            that._totalSubscription = that.siteTotalService.getTotal(forum.forumId)
              .subscribe(total => {
                if (total) {
                  if (total.registrantCount == 0)
                    that._registrantCount.next(-1);
                  else
                    that._registrantCount.next(total.registrantCount);

                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);

                  if (total.postCount == 0)
                    that._postCount.next(-1);
                  else
                    that._postCount.next(total.postCount);

                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);

                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              }
            );

            // get the default registrant that this user is serving as in this forum
            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.loggedInUserId)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = of(registrants[0]);
                else
                  that.defaultRegistrant = of(null);
              }
            );

            // get the tags for this forum
            that.forumTags = that.userForumTagService.getTags(forum.uid, forum.forumId);

            // get registrants for this forum
            that.registrants = that.userForumRegistrantService.getRegistrants(forum.uid, forum.forumId).pipe(
              switchMap(registrants => {
                if (registrants && registrants.length > 0) {
                  let observables = registrants.map(registrant => {
                    let getService$ = that.userServiceService.getService(registrant.uid, registrant.serviceId).pipe(
                      switchMap(service => {
                        if (service) {
                          let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                            switchMap(serviceImages => {
                              if (serviceImages && serviceImages.length > 0){
                                if (!serviceImages[0].tinyDownloadUrl)
                                  serviceImages[0].tinyDownloadUrl = '../../assets/defaultTiny.jpg';

                                return of(serviceImages[0]);
                              }
                              else return of(null);
                            })
                          );

                          return combineLatest([getDefaultServiceImage$]).pipe(
                            switchMap(results => {
                              const [defaultServiceImage] = results;

                              if (defaultServiceImage)
                                service.defaultServiceImage = of(defaultServiceImage);
                              else {
                                let tempImage = {
                                  tinyDownloadUrl: '../../assets/defaultTiny.jpg'
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
                          registrant.service = of(service);
                        else {
                          registrant.service = of(null);
                        }
                        return of(registrant);
                      })
                    );
                  });
                  return zip(...observables);
                }
                else return of([]);
              })
            );

            // get the user services
            that.userServices = that.userServiceService.getServices(that.loggedInUserId, that.numberItems, '', [], true, true);

            // get default forum image
            that.getDefaultForumImage();
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

  public navigateBack () {
    this.location.back();
  }
}
