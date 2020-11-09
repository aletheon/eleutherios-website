import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  SiteTotalService,
  UserActivityService,
  UserForumTagService,
  UserServiceTagService,
  UserForumServiceBlockService,
  UserServiceForumBlockService,
  UserForumBlockService,
  UserForumUserBlockService,
  UserServiceUserBlockService,
  UserServiceImageService,
  UserForumImageService,
  UserServiceService,
  UserForumService,
  UserForumRegistrantService,
  UserWhereServingService,
  UserImageService,
  ForumService,
  UserTagService,
  TagService,
  Registrant,
  Tag,
  Service,
  ForumBlock,
  ForumUserBlock,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith, tap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-service-new',
  templateUrl: './user.service.new.component.html',
  styleUrls: ['./user.service.new.component.css']
})
export class UserServiceNewComponent implements OnInit, OnDestroy, AfterViewInit  {
  @ViewChild('main', { static: false }) titleRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _serviceSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _searchForumSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _forumCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _tempSearchTags: string[] = [];
  private _settingDefaultServiceImage: boolean = false;
  private _addingTag = new BehaviorSubject(false);

  public service: Observable<any>;
  public defaultServiceImage: Observable<any>;
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public serviceGroup: FormGroup;
  public types: string[] = ['Public', 'Private'];
  public blockTypes: string[] = ['Remove', 'Block Forum', 'Block User'];
  public whereServings: Observable<any[]>;
  public serviceTags: Observable<any[]>;
  public matAutoCompleteSearchForums: Observable<any[]>;
  public matAutoCompleteSearchForumTags: Observable<any[]>;
  public matAutoCompleteServiceTags: Observable<any[]>;
  public searchForumResults: Observable<any[]> = of([]);
  public searchForumCtrl: FormControl;
  public tagServiceCtrl: FormControl;
  public tagSearchCtrl: FormControl;
  public searchTags: any[] = [];
  public serviceImages: Observable<any[]>;
  public images: Observable<any[]>;
  public searchForumIncludeTagsInSearch: boolean;
  public searchPrivateForums: boolean;
  public loading: Observable<boolean> = this._loading.asObservable();
  public serviceId: string;

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumTagService: UserForumTagService,
    private userServiceTagService: UserServiceTagService,
    private userForumBlockService: UserForumBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userServiceImageService: UserServiceImageService,
    private userForumImageService: UserForumImageService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userWhereServingService: UserWhereServingService,
    private userImageService: UserImageService,
    private forumService: ForumService,
    private userTagService: UserTagService,
    private tagService: TagService,
    private fb: FormBuilder, 

    private router: Router,
    private snackbar: MatSnackBar) {
      this.searchForumCtrl = new FormControl();
      this.tagServiceCtrl = new FormControl();
      this.tagSearchCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteServiceTags = this.tagServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
      
      // tagSearch mat subscription
      this.matAutoCompleteSearchForumTags = this.tagSearchCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
  }

  setDefaultServiceImage (serviceImage) {
    if (this._settingDefaultServiceImage == false){
      this._settingDefaultServiceImage = true;

      // get old default image
      const tempServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value)
        .subscribe(defaultServiceImages => {
          if (defaultServiceImages && defaultServiceImages.length > 0){
            if (defaultServiceImages[0].imageId != serviceImage.imageId){
              // set old default image to false
              defaultServiceImages[0].default = false;

              this.userServiceImageService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, defaultServiceImages[0].imageId, defaultServiceImages[0]).then(()=> {
                // set new service image to true
                serviceImage.default = true;

                this.userServiceImageService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
                  this._settingDefaultServiceImage = false;
                })
                .catch(error => {
                  this._settingDefaultServiceImage = false;
                });
              });
            }
            else {
              // set new forum image default to its opposite value
              serviceImage.default = !serviceImage.default;

              this.userServiceImageService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
                this._settingDefaultServiceImage = false;
              })
              .catch(error => {
                this._settingDefaultServiceImage = false;
              });
            }
          }
          else {
            // set new service image default to its opposite value
            serviceImage.default = !serviceImage.default;

            this.userServiceImageService.update(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
              this._settingDefaultServiceImage = false;
            })
            .catch(error => {
              this._settingDefaultServiceImage = false;
            });
          }
          tempServiceImageSubscription.unsubscribe();
        }
      );
    }
  }

  addImage (image) {
    if (this.serviceGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');

      setTimeout(() => {
        for (let i in this.serviceGroup.controls) {
          this.serviceGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
    }
    else {
      this.userServiceImageService.exists(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, image.imageId).then(exists => {
        if (!exists){
          image.default = false;
          this.userServiceImageService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, image);
        }
        else console.log('image already exists in service');
      });
    }
  }

  removeServiceImage (serviceImage) {
    this.userServiceImageService.exists(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceImage.imageId).then(exists => {
      if (exists)
        this.userServiceImageService.delete(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceImage.imageId);
    });
  }

  removeServiceTag (serviceTag) {
    this.userServiceTagService.exists(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceTag.tagId).then(exists => {
      if (exists)
        this.userServiceTagService.delete(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, serviceTag.tagId);
    });
  }

  removeSearchTag (tag) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    if (tagIndex > -1){
      this.searchTags.splice(tagIndex, 1);
      this._tempSearchTags.splice(tagIndex, 1);

      if (this.serviceGroup.get('searchPrivateForums').value == true){
        this.searchForumResults = this.userForumService.tagSearch(this.auth.uid, this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
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
  
                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
  
                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;
                      
                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
      }
      else {
        this.searchForumResults = this.forumService.tagSearch(this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
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
  
                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
  
                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
      }
    }
  }

  searchForumIncludeTagsInSearchClick () {
    if (this.serviceGroup.get('searchPrivateForums').value == true){
      this.searchForumResults = this.userForumService.tagSearch(this.auth.uid, this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
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

                      if (forumImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            forumImages[0].url = downloadUrl;
                          else
                            forumImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(forumImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, defaultRegistrant] = results;
                    
                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
    }
    else {
      this.searchForumResults = this.forumService.tagSearch(this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
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

                      if (forumImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            forumImages[0].url = downloadUrl;
                          else
                            forumImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(forumImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, defaultRegistrant] = results;

                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        tinyUrl: '../../../assets/defaultTiny.jpg'
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
    }
  }

  blockForum (event, forum) {
    const that = this;

    if (event.value == 'Remove'){
      this.userForumRegistrantService.getRegistrantFromPromise(forum.uid, forum.forumId, this.serviceGroup.get('serviceId').value)
        .then(registrant => {
          if (registrant){
            this.userForumRegistrantService.delete(forum.uid, forum.forumId, registrant.serviceId).then(() => {
              this.userActivityService.removeRegistrant(registrant.uid, forum.forumId, registrant);
            })
            .catch(error => {
              console.error(error);
            });
          }
        })
        .catch(error => {
          console.error(error);
        }
      );
    }
    else if (event.value == 'Block Forum'){
      const forumBlock: ForumBlock = {
        forumBlockId: '',
        forumId: forum.forumId,
        forumUid: forum.uid,
        serviceId: this.serviceGroup.get('serviceId').value,
        serviceUid: this.serviceGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userForumBlockService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, forum.forumId, forumBlock);
    }
    else if (event.value == 'Block User'){
      const forumUserBlock: ForumUserBlock = {
        forumUserBlockId: '',
        userId: forum.uid,
        forumId: forum.forumId,
        serviceId: this.serviceGroup.get('serviceId').value,
        serviceUid: this.serviceGroup.get('uid').value,
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };
      this.userForumUserBlockService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, forum.uid, forumUserBlock);
    }
  }

  addForum (forum) {
    if (this.serviceGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');
      setTimeout(() => {
        for (let i in this.serviceGroup.controls) {
          this.serviceGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
    }
    else {
      if (this.serviceGroup.get('title').value.length > 0){
        this.userForumServiceBlockService.serviceIsBlocked(forum.uid, forum.forumId, this.serviceGroup.get('serviceId').value)
          .then(serviceBlocked => {
            if (!serviceBlocked) {
              this.userServiceUserBlockService.userIsBlocked(forum.uid, forum.forumId, this.serviceGroup.get('uid').value)
                .then(serviceUserBlock => {
                  if (!serviceUserBlock) {
                    this.userServiceForumBlockService.forumIsBlocked(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, forum.forumId)
                      .then(forumBlocked => {
                        if (!forumBlocked) {
                          this.userForumUserBlockService.userIsBlocked(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, forum.uid)
                            .then(forumUserBlock => {
                              if (!forumUserBlock) {
                                this.userWhereServingService.serviceIsServingInForum(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, forum.forumId)
                                  .then(isServing => {
                                    if (!isServing) {
                                      const newRegistrant: Registrant = {
                                        registrantId: '',
                                        parentId: '',
                                        serviceId: this.serviceGroup.get('serviceId').value,
                                        uid: this.serviceGroup.get('uid').value,
                                        forumId: forum.forumId,
                                        forumUid: forum.uid,
                                        default: false,
                                        indexed: this.serviceGroup.get('indexed').value,
                                        creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                                        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                                      };

                                      this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(forum.uid, forum.forumId, this.serviceGroup.get('uid').value)
                                        .then(registrant => {
                                          if (registrant == null)
                                            newRegistrant.default = true;

                                          this.userForumRegistrantService.create(forum.uid, forum.forumId, newRegistrant).then(() => {
                                            const snackBarRef = this.snackbar.openFromComponent(
                                              NotificationSnackBar,
                                              {
                                                duration: 5000,
                                                data: 'Service saved',
                                                panelClass: ['green-snackbar']
                                              }
                                            );
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
                                    else {
                                      const snackBarRef = this.snackbar.openFromComponent(
                                        NotificationSnackBar,
                                        {
                                          duration: 8000,
                                          data: `'${this.serviceGroup.get('title').value}' is already serving in the forum '${forum.title}'`,
                                          panelClass: ['red-snackbar']
                                        }
                                      );
                                    }
                                  })
                                  .catch((error) =>{
                                    console.log("error adding service to forum " + JSON.stringify(error));
                                  }
                                );
                              }
                              else {
                                const snackBarRef = this.snackbar.openFromComponent(
                                  NotificationSnackBar,
                                  {
                                    duration: 8000,
                                    data: `The user of the forum '${forum.title}' has been blocked from requesting the service '${this.serviceGroup.get('title').value}'`,
                                    panelClass: ['red-snackbar']
                                  }
                                );
                              }
                            })
                            .catch((error) => {
                              console.log("error adding forum to service " + JSON.stringify(error));
                            }
                          );
                        }
                        else {
                          const snackBarRef = this.snackbar.openFromComponent(
                            NotificationSnackBar,
                            {
                              duration: 8000,
                              data: `The forum '${forum.title}' has been blocked from requesting the service '${this.serviceGroup.get('title').value}'`,
                              panelClass: ['red-snackbar']
                            }
                          );
                        }
                      })
                      .catch((error) => {
                        console.log("error adding forum to service " + JSON.stringify(error));
                      }
                    );
                  }
                  else {
                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: `The user of the service '${this.serviceGroup.get('title').value}' has been blocked from serving in the forum '${forum.title}'`,
                        panelClass: ['red-snackbar']
                      }
                    );
                  }
                })
                .catch((error) => {
                  console.log("error adding forum to service " + JSON.stringify(error));
                }
              );
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `The service '${this.serviceGroup.get('title').value}' has been blocked from serving in the forum '${forum.title}'`,
                  panelClass: ['red-snackbar']
                }
              );
            }
          })
          .catch((error) => {
            console.log("error adding forum to service " + JSON.stringify(error));
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
  }

  removeForum (forum) {
    const that = this;

    this.userForumRegistrantService.getRegistrantFromPromise(forum.uid, forum.forumId, this.serviceGroup.get('serviceId').value)
      .then(registrant => {
        if (registrant){
          this.userForumRegistrantService.delete(forum.uid, forum.forumId, registrant.serviceId).then(() => {
            this.userActivityService.removeRegistrant(registrant.uid, forum.forumId, registrant).then(() => {
              const snackBarRef = that.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 5000,
                  data: 'Service saved',
                  panelClass: ['green-snackbar']
                }
              );
            })
            .catch(error => {
              const snackBarRef = that.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: error.message,
                  panelClass: ['red-snackbar']
                }
              );
            });
          })
          .catch(error => {
            console.error(error);
          });
        }
      })
      .catch(error => {
        console.error(error);
      }
    );
  }

  autoServiceTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  autoSearchForumTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  autoSearchForumDisplayFn (forum: any): string {
    return forum? forum.title: forum;
  }

  serviceTagsSelectionChange (tag: any) {
    if (this.serviceGroup.get('title').value.length > 0){
      this.userServiceTagService.exists(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, tag.tagId).then(exists => {
        if (!exists){
          this.userServiceTagService.getTagCount(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value).then(count => {
            if (count < 5){
              if (this._addingTag.getValue() == false){
                this._addingTag.next(true);
  
                this.userServiceTagService.create(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value, tag)
                  .then(() => {
                    // delay to prevent user adding multiple tags simultaneously
                    setTimeout(() => {
                      this._addingTag.next(false);
                    }, 1000);
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
            } 
            else {
              const snackBarRef =this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'This is the alpha version of eleutherios and is limited to only 5 tags each service',
                  panelClass: ['red-snackbar']
                }
              );
            }
          });
        }
      });
    }
  }

  searchForumTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    if (tagIndex == -1){
      this.searchTags.push(tag);
      this._tempSearchTags.push(tag.tag);
      this.searchTags.sort();
      this._tempSearchTags.sort();

      if (this.serviceGroup.get('searchPrivateForums').value == true){
        this.searchForumResults = this.userForumService.tagSearch(this.auth.uid, this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
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
  
                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
  
                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
      }
      else {
        this.searchForumResults = this.forumService.tagSearch(this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
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
  
                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
  
                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;
                            
                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../../assets/defaultTiny.jpg';
              
                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
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
      }
    }
  }

  ngOnDestroy () {
    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._searchForumSubscription)
      this._searchForumSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();
  }

  trackServiceTags (index, tag) { return tag.tagId; }
  trackServiceImages (index, serviceImage) { return serviceImage.imageId; }
  trackImages (index, image) { return image.imageId; }
  trackWhereServings (index, whereServing) { return whereServing.forumId; }
  trackSearchTags (index, tag) { return tag.tagId; }
  trackSearchForumResults (index, forum) { return forum.forumId; }

  ngAfterViewInit () {
    const that = this;

    let intervalId = setInterval(() => {
      if(that._loading.getValue() == false) {
        clearInterval(intervalId);

        // set focus
        for (let i in that.serviceGroup.controls) {
          that.serviceGroup.controls[i].markAsTouched();
        }
        that.titleRef.nativeElement.focus();
      }
    }, 1000);
  }
  
  ngOnInit () {
    this._loading.next(true);
    const service: Service = {
      serviceId: '',
      uid: this.auth.uid,
      type: 'Private',
      title: '',
      title_lowercase: '',
      description: '',
      website: '',
      default: false,
      indexed: false,
      rate: 0,
      paymentType: 'Free',
      paymentSubType: '',
      amount: 0,
      includeDescriptionInDetailPage: false,
      includeImagesInDetailPage: false,
      includeTagsInDetailPage: false,
      creationDate: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    this.service = this.userServiceService.create(this.auth.uid, service);    
    this.searchPrivateForums = true;
    this.searchForumIncludeTagsInSearch = true;
    this.initForm();
  }

  private initForm () {
    const that = this;
    
    this.serviceGroup = this.fb.group({
      serviceId:                      [''],
      uid:                            [''],
      type:                           [''],
      title:                          ['', Validators.required ],
      title_lowercase:                [''],
      description:                    [''],
      website:                        [''],
      default:                        [''],
      indexed:                        [''],
      rate:                           [''],
      paymentType:                    [''],
      paymentSubType:                 [''],
      amount:                         [''],
      includeDescriptionInDetailPage: [''],
      includeImagesInDetailPage:      [''],
      includeTagsInDetailPage:        [''],
      searchPrivateForums:            [''],
      searchForumIncludeTagsInSearch: [''],
      lastUpdateDate:                 [''],
      creationDate:                   ['']
    });
    this.serviceGroup.get('searchPrivateForums').setValue(this.searchPrivateForums);
    this.serviceGroup.get('searchForumIncludeTagsInSearch').setValue(this.searchForumIncludeTagsInSearch);

    //  ongoing subscription
    this._serviceSubscription = this.service.subscribe(service => {
      if (service){
        this.serviceGroup.patchValue(service);

        if (service.title.length == 0)
          that.serviceGroup.get('indexed').disable();
        else
          that.serviceGroup.get('indexed').enable();
      }
    });

    // run once subscription
    const runOnceSubscription = this.service.subscribe(service => {
      if (service){
        this.serviceId = service.serviceId;

        let load = async function(){
          try {
            // service totals
            that._totalSubscription = that.siteTotalService.getTotal(service.serviceId)
              .subscribe(total => {
                if (total) {
                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);
                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              });

            // default service image
            that._defaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
            )
            .subscribe(serviceImage => {
              if (serviceImage)
                that.defaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultThumbnail.jpg'
                };
                that.defaultServiceImage = of(tempImage);
              }
            });

            // service tags
            that.serviceTags = that.userServiceTagService.getTags(service.uid, service.serviceId);

            // images
            that.images = that.userImageService.getImages(that.auth.uid, 1000, null);

            // service images
            that.serviceImages = that.userServiceImageService.getServiceImages(service.uid, service.serviceId, 1000, null);

            that.whereServings = that.userWhereServingService.getWhereServings(service.uid, service.serviceId).pipe(
              switchMap(whereServings => {
                if (whereServings && whereServings.length > 0) {
                  let observables = whereServings.map(whereServing => {
                    return that.userForumService.getForum(whereServing.uid, whereServing.forumId).pipe(
                      switchMap(forum => {
                        if (forum) {
                          let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                            switchMap(registrants => {
                              if (registrants && registrants.length > 0)
                                return of(registrants[0]);
                              else
                                return of(null);
                            })
                          );
                          let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                            switchMap(forumImages => {
                              if (forumImages && forumImages.length > 0){
                                let getDownloadUrl$: Observable<any>;
          
                                if (forumImages[0].tinyUrl)
                                  getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
          
                                return combineLatest([getDownloadUrl$]).pipe(
                                  switchMap(results => {
                                    const [downloadUrl] = results;
                                    
                                    if (downloadUrl)
                                      forumImages[0].url = downloadUrl;
                                    else
                                      forumImages[0].url = '../../../assets/defaultTiny.jpg';
                      
                                    return of(forumImages[0]);
                                  })
                                );
                              }
                              else return of(null);
                            })
                          );

                          return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                            switchMap(results => {
                              const [defaultForumImage, defaultRegistrant] = results;

                              if (defaultForumImage)
                                forum.defaultForumImage = of(defaultForumImage);
                              else {
                                let tempImage = {
                                  url: '../../../assets/defaultTiny.jpg'
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
                      })
                    );
                  });

                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      if (result)
                        whereServings[i].forum = of(result);
                      else
                        whereServings[i].forum = of(null);
                      return whereServings[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            if (that.serviceGroup.get('searchPrivateForums').value == true){
              // searchForum mat subscription
              that.matAutoCompleteSearchForums = that.searchForumCtrl.valueChanges.pipe(
                startWith(''),
                switchMap(searchTerm => that.userForumService.search(that.auth.uid, searchTerm, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true))
              );

              // searchForum other subscriptions
              that._searchForumSubscription = that.searchForumCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchForumResults = that.userForumService.tagSearch(that.auth.uid, searchTerm, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
                    switchMap(forums => {
                      if (forums && forums.length > 0) {
                        let observables = forums.map(forum => {
                          if (forum) {
                            let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                              switchMap(registrants => {
                                if (registrants && registrants.length > 0)
                                  return of(registrants[0]);
                                else
                                  return of(null);
                              })
                            );
                            let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                              switchMap(forumImages => {
                                if (forumImages && forumImages.length > 0){
                                  let getDownloadUrl$: Observable<any>;
            
                                  if (forumImages[0].tinyUrl)
                                    getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
            
                                  return combineLatest([getDownloadUrl$]).pipe(
                                    switchMap(results => {
                                      const [downloadUrl] = results;
                                      
                                      if (downloadUrl)
                                        forumImages[0].url = downloadUrl;
                                      else
                                        forumImages[0].url = '../../../assets/defaultTiny.jpg';
                        
                                      return of(forumImages[0]);
                                    })
                                  );
                                }
                                else return of(null);
                              })
                            );

                            return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                              switchMap(results => {
                                const [defaultForumImage, defaultRegistrant] = results;

                                if (defaultForumImage)
                                  forum.defaultForumImage = of(defaultForumImage);
                                else {
                                  let tempImage = {
                                    url: '../../../assets/defaultTiny.jpg'
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
                })
              ).subscribe();

              that.searchForumResults = that.userForumService.tagSearch(that.auth.uid, that.searchForumCtrl.value, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
                switchMap(forums => {
                  if (forums && forums.length > 0) {
                    let observables = forums.map(forum => {
                      if (forum) {
                        let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                          switchMap(registrants => {
                            if (registrants && registrants.length > 0)
                              return of(registrants[0]);
                            else
                              return of(null);
                          })
                        );
                        let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                          switchMap(forumImages => {
                            if (forumImages && forumImages.length > 0){
                              let getDownloadUrl$: Observable<any>;
        
                              if (forumImages[0].tinyUrl)
                                getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
        
                              return combineLatest([getDownloadUrl$]).pipe(
                                switchMap(results => {
                                  const [downloadUrl] = results;
                                  
                                  if (downloadUrl)
                                    forumImages[0].url = downloadUrl;
                                  else
                                    forumImages[0].url = '../../../assets/defaultTiny.jpg';
                    
                                  return of(forumImages[0]);
                                })
                              );
                            }
                            else return of(null);
                          })
                        );

                        return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                          switchMap(results => {
                            const [defaultForumImage, defaultRegistrant] = results;

                            if (defaultForumImage)
                              forum.defaultForumImage = of(defaultForumImage);
                            else {
                              let tempImage = {
                                url: '../../../assets/defaultTiny.jpg'
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
            }
            else {
              // searchForum mat subscription
              that.matAutoCompleteSearchForums = that.searchForumCtrl.valueChanges.pipe(
                startWith(''),
                switchMap(searchTerm => that.forumService.search(searchTerm, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true))
              );

              // searchForum other subscriptions
              that._searchForumSubscription = that.searchForumCtrl.valueChanges.pipe(
                tap(searchTerm => {
                  that.searchForumResults = that.forumService.tagSearch(searchTerm, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
                    switchMap(forums => {
                      if (forums && forums.length > 0) {
                        let observables = forums.map(forum => {
                          if (forum) {
                            let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                              switchMap(registrants => {
                                if (registrants && registrants.length > 0)
                                  return of(registrants[0]);
                                else
                                  return of(null);
                              })
                            );
                            let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                              switchMap(forumImages => {
                                if (forumImages && forumImages.length > 0){
                                  let getDownloadUrl$: Observable<any>;
            
                                  if (forumImages[0].tinyUrl)
                                    getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
            
                                  return combineLatest([getDownloadUrl$]).pipe(
                                    switchMap(results => {
                                      const [downloadUrl] = results;
                                      
                                      if (downloadUrl)
                                        forumImages[0].url = downloadUrl;
                                      else
                                        forumImages[0].url = '../../../assets/defaultTiny.jpg';
                        
                                      return of(forumImages[0]);
                                    })
                                  );
                                }
                                else return of(null);
                              })
                            );

                            return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                              switchMap(results => {
                                const [defaultForumImage, defaultRegistrant] = results;

                                if (defaultForumImage)
                                  forum.defaultForumImage = of(defaultForumImage);
                                else {
                                  let tempImage = {
                                    url: '../../../assets/defaultTiny.jpg'
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
                })
              ).subscribe();

              that.searchForumResults = that.forumService.tagSearch(that.searchForumCtrl.value, that._tempSearchTags, null, that.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
                switchMap(forums => {
                  if (forums && forums.length > 0) {
                    let observables = forums.map(forum => {
                      if (forum) {
                        let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                          switchMap(registrants => {
                            if (registrants && registrants.length > 0)
                              return of(registrants[0]);
                            else
                              return of(null);
                          })
                        );
                        let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                          switchMap(forumImages => {
                            if (forumImages && forumImages.length > 0){
                              let getDownloadUrl$: Observable<any>;
        
                              if (forumImages[0].tinyUrl)
                                getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
        
                              return combineLatest([getDownloadUrl$]).pipe(
                                switchMap(results => {
                                  const [downloadUrl] = results;
                                  
                                  if (downloadUrl)
                                    forumImages[0].url = downloadUrl;
                                  else
                                    forumImages[0].url = '../../../assets/defaultTiny.jpg';
                    
                                  return of(forumImages[0]);
                                })
                              );
                            }
                            else return of(null);
                          })
                        );

                        return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                          switchMap(results => {
                            const [defaultForumImage, defaultRegistrant] = results;

                            if (defaultForumImage)
                              forum.defaultForumImage = of(defaultForumImage);
                            else {
                              let tempImage = {
                                url: '../../../assets/defaultTiny.jpg'
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
            }
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

  createSearchTag () {
    if (this.tagSearchCtrl.value.length > 0){
      let valueToSearch = this.tagSearchCtrl.value.replace(/\s\s+/g,' ').toLowerCase();

      if (valueToSearch.length > 0){
        if (valueToSearch.length <= 50){
          if (/^[A-Za-z0-9\s]*$/.test(valueToSearch)){
            this.tagService.exists(valueToSearch).then(result => {
              if (!result){
                const newTag: Tag = {
                  tagId: '',
                  uid: this.auth.uid,
                  tag: valueToSearch,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                  creationDate: firebase.firestore.FieldValue.serverTimestamp()
                };
      
                const userTag = this.userTagService.create(this.auth.uid, newTag).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: `Created new tag '${valueToSearch}'`,
                      panelClass: ['green-snackbar']
                    }
                  );
                });
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `The tag '${valueToSearch}' already exists`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            });
          }
          else {
            const snackBarRef =this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `Invalid characters we're located in the tag field, valid characters include [A-Za-z0-9]`,
                panelClass: ['red-snackbar']
              }
            );
          }
        }
        else {
          const snackBarRef =this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'This is the alpha version of eleutherios and is limited to only 50 characters per tag',
              panelClass: ['red-snackbar']
            }
          );
        }
      }
    }
  }

  createServiceTag () {
    if (this.tagServiceCtrl.value.length > 0){
      let valueToSearch = this.tagServiceCtrl.value.replace(/\s\s+/g,' ').toLowerCase();

      if (valueToSearch.length > 0){
        if (valueToSearch.length <= 50){
          if (/^[A-Za-z0-9\s]*$/.test(valueToSearch)){
            this.tagService.exists(valueToSearch).then(result => {
              if (!result){
                const newTag: Tag = {
                  tagId: '',
                  uid: this.auth.uid,
                  tag: valueToSearch,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                  creationDate: firebase.firestore.FieldValue.serverTimestamp()
                };
      
                const userTag = this.userTagService.create(this.auth.uid, newTag).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: `Created new tag '${valueToSearch}'`,
                      panelClass: ['green-snackbar']
                    }
                  );
                });
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `The tag '${valueToSearch}' already exists`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            });
          }
          else {
            const snackBarRef =this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `Invalid characters we're located in the tag field, valid characters include [A-Za-z0-9]`,
                panelClass: ['red-snackbar']
              }
            );
          }
        }
        else {
          const snackBarRef =this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'This is the alpha version of eleutherios and is limited to only 50 characters per tag',
              panelClass: ['red-snackbar']
            }
          );
        }
      }
    }
  }

  searchPrivateForumsClick () {
    if (this.serviceGroup.get('searchPrivateForums').value == true){
      this.matAutoCompleteSearchForums = this.searchForumCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.userForumService.search(this.auth.uid, searchTerm, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true)
        )
      );
      
      this._searchForumSubscription = this.searchForumCtrl.valueChanges.pipe(
        tap(searchTerm => {
          this.searchForumResults = this.userForumService.tagSearch(this.auth.uid, searchTerm, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
            switchMap(forums => {
              if (forums && forums.length > 0){
                let observables = forums.map(forum => {
                  if (forum){
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
    
                          if (forumImages[0].tinyUrl)
                            getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
    
                          return combineLatest([getDownloadUrl$]).pipe(
                            switchMap(results => {
                              const [downloadUrl] = results;
                              
                              if (downloadUrl)
                                forumImages[0].url = downloadUrl;
                              else
                                forumImages[0].url = '../../../assets/defaultTiny.jpg';
                
                              return of(forumImages[0]);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );

                    return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                      switchMap(results => {
                        const [defaultForumImage, defaultRegistrant] = results;

                        if (defaultForumImage)
                          forum.defaultForumImage = of(defaultForumImage);
                        else {
                          let tempImage = {
                            url: '../../../assets/defaultTiny.jpg'
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
        })
      ).subscribe();

      this.searchForumResults = this.userForumService.tagSearch(this.auth.uid, this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
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

                      if (forumImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            forumImages[0].url = downloadUrl;
                          else
                            forumImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(forumImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
      
                return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, defaultRegistrant] = results;

                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
    }
    else {
      this.matAutoCompleteSearchForums = this.searchForumCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.forumService.search(searchTerm, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true)
        )
      );

      this._searchForumSubscription = this.searchForumCtrl.valueChanges.pipe(
        tap(searchTerm => {
          this.searchForumResults = this.forumService.tagSearch(searchTerm, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
            switchMap(forums => {
              if (forums && forums.length > 0){
                let observables = forums.map(forum => {
                  if (forum){
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
    
                          if (forumImages[0].tinyUrl)
                            getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());
    
                          return combineLatest([getDownloadUrl$]).pipe(
                            switchMap(results => {
                              const [downloadUrl] = results;
                              
                              if (downloadUrl)
                                forumImages[0].url = downloadUrl;
                              else
                                forumImages[0].url = '../../../assets/defaultTiny.jpg';
                
                              return of(forumImages[0]);
                            })
                          );
                        }
                        else return of(null);
                      })
                    );

                    return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                      switchMap(results => {
                        const [defaultForumImage, defaultRegistrant] = results;

                        if (defaultForumImage)
                          forum.defaultForumImage = of(defaultForumImage);
                        else {
                          let tempImage = {
                            url: '../../../assets/defaultTiny.jpg'
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
        })
      ).subscribe();

      this.searchForumResults = this.forumService.tagSearch(this.searchForumCtrl.value, this._tempSearchTags, null, this.serviceGroup.get('searchForumIncludeTagsInSearch').value, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
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

                      if (forumImages[0].tinyUrl)
                        getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                      return combineLatest([getDownloadUrl$]).pipe(
                        switchMap(results => {
                          const [downloadUrl] = results;
                          
                          if (downloadUrl)
                            forumImages[0].url = downloadUrl;
                          else
                            forumImages[0].url = '../../../assets/defaultTiny.jpg';
            
                          return of(forumImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
      
                return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, defaultRegistrant] = results;
                    
                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultTiny.jpg'
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
    }
  }

  saveChanges () {
    if (this.serviceGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');
      setTimeout(() => {
        for (let i in this.serviceGroup.controls) {
          this.serviceGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
      return;
    }

    let tempTitle = this.serviceGroup.get('title').value.replace(/\s\s+/g,' ');

    if (tempTitle.length <= 100){
      if (/^[A-Za-z0-9\s]*$/.test(tempTitle)){
        const data = {
          serviceId: this.serviceGroup.get('serviceId').value,
          uid: this.serviceGroup.get('uid').value,
          type: this.serviceGroup.get('type').value,
          title: tempTitle,
          title_lowercase: tempTitle.toLowerCase(),
          description: this.serviceGroup.get('description').value.trim(),
          website: this.serviceGroup.get('website').value.trim(),
          default: this.serviceGroup.get('default').value,
          indexed: this.serviceGroup.get('indexed').value != undefined ? this.serviceGroup.get('indexed').value : false,
          rate: this.serviceGroup.get('rate').value,
          paymentType: this.serviceGroup.get('paymentType').value,
          paymentSubType: this.serviceGroup.get('paymentSubType').value,
          amount: this.serviceGroup.get('amount').value,
          includeDescriptionInDetailPage: this.serviceGroup.get('includeDescriptionInDetailPage').value,
          includeImagesInDetailPage: this.serviceGroup.get('includeImagesInDetailPage').value,
          includeTagsInDetailPage: this.serviceGroup.get('includeTagsInDetailPage').value,
          lastUpdateDate: this.serviceGroup.get('lastUpdateDate').value,
          creationDate: this.serviceGroup.get('creationDate').value
        };
        
        this.userServiceService.update(this.auth.uid, data.serviceId, data).then(() => {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 5000,
              data: 'Service saved',
              panelClass: ['green-snackbar']
            }
          );
        });
      }
      else {
        const snackBarRef =this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: `Invalid characters we're located in the title field, valid characters include [A-Za-z0-9]`,
            panelClass: ['red-snackbar']
          }
        );
      }
    }
    else {
      const snackBarRef =this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: 'This is the alpha version of eleutherios and is limited to only 100 characters per title',
          panelClass: ['red-snackbar']
        }
      );
    }
  }
}