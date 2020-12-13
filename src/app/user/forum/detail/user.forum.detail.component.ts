import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { Location } from '@angular/common';
import { MatExpansionPanel } from '@angular/material/expansion';

import {
  SiteTotalService,
  UserActivityService,
  UserForumTagService,
  UserForumService,
  UserServiceService,
  UserForumRegistrantService,
  UserForumImageService,
  UserServiceImageService,
  UserServiceBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserServiceForumBlockService,
  UserForumUserBlockService,
  Registrant,
  ServiceBlock,
  ServiceUserBlock,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-detail',
  templateUrl: './user.forum.detail.component.html',
  styleUrls: ['./user.forum.detail.component.css']
})
export class UserForumDetailComponent implements OnInit, OnDestroy {
  @ViewChild('descriptionPanel', { static: false }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: false }) _descriptionPanelTitle: ElementRef; 

  private _loading = new BehaviorSubject(false);
  private _initialforumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _defaultRegistrantPermissionSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _registrantCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _postCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _canViewDetail = new BehaviorSubject(false);

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
  public canViewDetail: Observable<boolean> = this._canViewDetail.asObservable();
  public blockTypes: string[] = ['Remove', 'Block Service', 'Block User'];
  public defaultForumImage: Observable<any>;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumTagService: UserForumTagService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userServiceBlockService: UserServiceBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar,
    private location: Location,
    private changeDetector : ChangeDetectorRef) {
      this.userServicesCtrl = new FormControl();
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else 
      this._descriptionPanelTitle.nativeElement.style.display = "block";
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
                                        indexed: this.userServicesCtrl.value.indexed,
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
                                        console.log('here 2');
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
        console.log('here 3');
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
      const userBlock: ServiceUserBlock = {
        serviceUserBlockId: '',
        userId: registrant.uid,
        serviceId: registrant.serviceId,
        forumId: this.forumGroup.get('forumId').value,
        forumUid: this.forumGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userServiceUserBlockService.create(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.uid, userBlock);
    }
  }

  removeRegistrant (registrant) {
    this.userForumRegistrantService.delete(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, registrant.serviceId).then(() => {
      this.userActivityService.removeRegistrant(registrant.uid, this.forumGroup.get('forumId').value, registrant);
    })
    .catch(error => {
      console.log('here 4');
      console.error(error);
    });
  }
  
  changeType (forum) {
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

  delete (forum) {
    this.userForumService.delete(forum.uid, forum.forumId).then(() => {
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

  getDefaultForumImage () {
    this._defaultForumImageSubscription = this.userForumImageService.getDefaultForumImages(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value).pipe(
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
    )
    .subscribe(forumImage => {
      if (forumImage)
        this.defaultForumImage = of(forumImage);
      else {
        let tempImage = {
          url: '../../../assets/defaultThumbnail.jpg'
        };
        this.defaultForumImage = of(tempImage);
      }
    });
  }

  trackForumTags (index, forumTag) { return forumTag.tagId; }

  trackRegistrants (index, registrant) { return registrant.registrantId; }

  trackUserServices (index, service) { return service.serviceId; }

  ngOnDestroy () {
    if (this._initialforumSubscription)
      this._initialforumSubscription.unsubscribe();

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._defaultRegistrantPermissionSubscription)
      this._defaultRegistrantPermissionSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();
  }

  checkPermissions (forum) {
    return new Promise<void>((resolve, reject) => {
      this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(forum.uid, forum.forumId, this.auth.uid)
        .then(defaultRegistrant => {
          if (defaultRegistrant)
            this._canViewDetail.next(true);
          else
            this._canViewDetail.next(false);

          resolve();
        }
      ).catch(error => {
        reject(error);
      });
    });
  }

  ngOnInit () {
    // get params
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let forumId = params['forumId'];
      let forumUserId = params['userId'];
      let serviceId = params['serviceId'];
      let serviceUserId = params['serviceUserId'];
      let notificationId = params['notificationId'];
      let notificationUserId = params['notificationUserId'];
      let parentForumId = params['parentForumId'];
      let parentForumUserId = params['forumUserId'];

      if (serviceId || notificationId || parentForumId){
        if (serviceId){
          this.id = of(serviceId);
          this.returnUserId = of(serviceUserId);
          this.returnType = of('Service');
        }
        else if (notificationId) {
          this.id = of(notificationId);
          this.returnUserId = of(notificationUserId);
          this.returnType = of('Notification');
        }
        else if (parentForumId) {
          this.id = of(parentForumId);
          this.returnUserId = of(parentForumUserId);
          this.returnType = of('Forum');
        }
      }
  
      this._initialforumSubscription = this.userForumService.getForum(forumUserId, forumId).subscribe(forum => {
        if (forum){
          if (forum.uid == this.auth.uid){
            this._canViewDetail.next(true);
            this.forum = this.userForumService.getForum(forumUserId, forumId);
            this.initForm();
          }
          else {
            if (forum.indexed == true){
              // check permissions
              this.checkPermissions(forum)
                .then(() => {
                  this.forum = this.userForumService.getForum(forumUserId, forumId);
                  this.initForm();
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
                  data: 'Forum does not exist',
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/']);
            }
          }
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
        if (forum){
          this.forumGroup.patchValue(forum);

          if (forum.uid == this.auth.uid)
            this._canViewDetail.next(true);
          else {
            if (forum.indexed == true){
              // check permissions
              this.checkPermissions(forum)
                .then(() => {
                  // do something
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
                  data: 'Forum does not exist',
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/']);
            }   
          }
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
            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid)
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
                                let getDownloadUrl$: Observable<any>;
  
                                if (serviceImages[0].tinyUrl)
                                  getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].tinyUrl).getDownloadURL());
                        
                                return combineLatest([getDownloadUrl$]).pipe(
                                  switchMap(results => {
                                    const [downloadUrl] = results;
                                    
                                    if (downloadUrl)
                                      serviceImages[0].url = downloadUrl;
                                    else
                                      serviceImages[0].url = '../../../assets/defaultTiny.jpg';
                        
                                    return of(serviceImages[0]);
                                  })
                                );
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
                                  url: '../../../assets/defaultTiny.jpg'
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
            that.userServices = that.userServiceService.getServices(that.auth.uid, that.numberItems, '', [], true, true);

            // get default forum image
            that.getDefaultForumImage();
          }
          catch (error) {
            console.log('here');
            throw error;
          }
        }
    
        // call load
        load().then(() => {
          this._loading.next(false);
          this.changeDetector.detectChanges();

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