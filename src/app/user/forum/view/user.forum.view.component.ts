import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { AngularFireDatabase } from '@angular/fire/database';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {
  SiteTotalService,
  UserActivityService,
  UserForumService,
  UserServiceService,
  UserForumRegistrantService,
  UserForumForumService,
  UserForumImageService,
  UserServiceImageService,
  UserForumPostService,
  UserForumBreadcrumbService,
  UserForumTagService,
  UserServiceBlockService,
  UserServiceUserBlockService,
  MessageSharingService,  
  Registrant,
  Post,
  ServiceBlock,
  ServiceUserBlock,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelect } from '@angular/material/select';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';
import { NgxAutoScroll } from "ngx-auto-scroll";

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-view',
  templateUrl: './user.forum.view.component.html',
  styleUrls: ['./user.forum.view.component.css']
})
export class UserForumViewComponent implements OnInit, OnDestroy  {
  @ViewChild(NgxAutoScroll, { static: false }) test: NgxAutoScroll;
  // @ViewChild('scrollMe', { static: false }) scrollMeContainer: ElementRef;
  @ViewChild('audioSound', { static: false }) audioSound: ElementRef;
  @ViewChild('descriptionPanelTitle', { static: false }) descriptionPanelTitle: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _initialForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _userRegistrantsSubscription: Subscription; 
  private _defaultForumImageSubscription: Subscription;
  private _postsSubscription: Subscription;
  private _newPostsRef: any;
  private _newPostsCallback: any;
  private _registrantCount = new BehaviorSubject(0);
  private _forumCount = new BehaviorSubject(0);
  private _postCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _talkingToServer: boolean = false;
  private _tempForum: any;
  
  public forum: Observable<any>;
  public registrantCount: Observable<number> = this._registrantCount.asObservable();
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public postCount: Observable<number> = this._postCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public posts: Observable<any[]>;
  public registrants: Observable<any[]>;
  public forumForums: Observable<any[]>;
  public userRegistrants: Observable<any[]>;
  public breadcrumbs: Observable<any[]>;
  public blockTypes: string[] = ['Remove', 'Block Service', 'Block User'];
  public newMessage: string;
  public messages: Observable<any[]>;
  public forumTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();
  public newMessageCtrl: FormControl;
  public userRegistrantsCtrl: FormControl;
  public selectedUserRegistrant: any;
  public userId: string;
  public forumId: string;
  public defaultRegistrant: any;
  public defaultSelectedRegistrant: any;
  public defaultForumImage: Observable<any>;
  public id: Observable<string>;
  public returnUserId: Observable<string>;
  public returnType: Observable<string> = of('');

  constructor(private db: AngularFireDatabase,
    public  auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumForumService: UserForumForumService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumPostService: UserForumPostService,
    private userForumBreadcrumbService: UserForumBreadcrumbService,
    private userForumTagService: UserForumTagService,
    private userServiceBlockService: UserServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private messageSharingService: MessageSharingService,
    private location: Location,
    private router: Router,
    private snackbar: MatSnackBar) {
      this.newMessageCtrl = new FormControl();
      this.userRegistrantsCtrl = new FormControl();
  }

  ngOnDestroy () {
    this.messageSharingService.changeViewForumId(''); // dis-inform listeners that the view forum page is viewing this forum

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._userRegistrantsSubscription)
      this._userRegistrantsSubscription.unsubscribe();

    if (this._postsSubscription)
      this._postsSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._newPostsRef && this._newPostsCallback)
      this._newPostsRef.off('child_added', this._newPostsCallback);
  }

  trackPosts (index, post) { return post.postId; }
  trackForumTags (index, forumTag) { return forumTag.tagId; }
  trackForumForums (index, forumForum) { return forumForum.forumId; }
  trackRegistrants (index, registrant) { return registrant.registrantId; }
  trackUserRegistrants (index, registrant) { return registrant.registrantId; }
  trackBreadcrumbs (index, breadcrumb) { return breadcrumb.forumId; }

  ngOnInit () {
    const that = this;

    this.route.queryParams.subscribe((params: Params) => {
      this.forumId = params['forumId'];
      this.userId = params['userId'];

      let serviceId = params['serviceId'];
      let serviceUserId = params['serviceUserId']
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

      this.messageSharingService.changeViewForumId('');

      this._initialForumSubscription = this.userForumService.getForum(this.userId, this.forumId).subscribe(forum => {
        this._initialForumSubscription.unsubscribe();

        if (forum){
          this._tempForum = forum;

          // ensure user is serving in the forum before viewing it
          this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userId, this.forumId, this.auth.uid)
            .then(registrant => {
              if (registrant){
                this.forum = this.userForumService.getForum(this.userId, this.forumId);
                this.initForm();
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `You don't have any services serving in the forum '${forum.title}'`,
                    panelClass: ['red-snackbar']
                  }
                );
                this.router.navigate(['/']);
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
            this.router.navigate(['/']);
          });
        }
        else {
          const snackBarRef = that.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Forum does not exist or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          that.router.navigate(['/']);
        }
      });
    });
  }

  private initForm () {
    const that = this;

    this.messageSharingService.changeViewForumId(''); // dis-inform listeners that the view forum page is viewing this forum

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._userRegistrantsSubscription)
      this._userRegistrantsSubscription.unsubscribe();

    if (this._postsSubscription)
      this._postsSubscription.unsubscribe();

    if (this._newPostsRef && this._newPostsCallback)
      this._newPostsRef.off('child_added', this._newPostsCallback);

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    this._loading.next(true);
    
    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum)
          this._tempForum = forum;
      }
    );

    // run once subscription
    const runOnceSubscription = this.forum.subscribe(forum => {
      if (forum){
        let load = async function(){
          try {
            // forum totals
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

            // get default registrant for this user viewing this forum
            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = registrants[0];
                else {
                  that.defaultRegistrant = null;

                  const snackBarRef = that.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: `You don't have any services serving in the forum '${that._tempForum.title}'`,
                      panelClass: ['red-snackbar']
                    }
                  );
                  this.router.navigate(['/']);
                }
              }
            );

            // forum tags
            that.forumTags = that.userForumTagService.getTags(forum.uid, forum.forumId);

            // forum breadcrumbs
            that.breadcrumbs = that.userForumBreadcrumbService.getBreadcrumbs(forum.uid, forum.forumId).pipe(
              switchMap(breadcrumbs => {
                if (breadcrumbs && breadcrumbs.length > 0) {
                  let observables = breadcrumbs.map(breadcrumb => {
                    let getForum$ = that.userForumService.getForum(breadcrumb.uid, breadcrumb.forumId);
                    let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(breadcrumb.uid, breadcrumb.forumId, that.auth.uid).pipe(
                      switchMap(registrants => {
                        if (registrants && registrants.length > 0)
                          return of(registrants[0]);
                        else
                          return of(null);
                      })
                    );

                    return combineLatest([getForum$, getDefaultRegistrant$]).pipe(
                      switchMap(results => {
                        const [forum, defaultRegistrant] = results;

                        if (forum){
                          if (defaultRegistrant)
                            forum.defaultRegistrant = of(defaultRegistrant);
                          else
                            forum.defaultRegistrant = of(null);

                          return of(forum);
                        }
                        else return of(null);
                      })
                    );
                  });

                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      if (result)
                        breadcrumbs[i].forum = of(result);
                      else
                        breadcrumbs[i].forum = of(null);
                      return breadcrumbs[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            // Get all forumForums, only show those that are indexed
            // or if not indexed, but belonging to current user
            // so they can remove it

            // forum forums
            that.forumForums = that.userForumForumService.getForumForums(forum.uid, forum.forumId).pipe(
              switchMap(forumForums => {
                if (forumForums && forumForums.length > 0) {
                  let observables = forumForums.map(forumForum => {
                    let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forumForum.uid, forumForum.forumId, that.auth.uid).pipe(
                      switchMap(registrants => {
                        if (registrants && registrants.length > 0)
                          return of(registrants[0]);
                        else
                          return of(null);
                      })
                    );
                    let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forumForum.uid, forumForum.forumId).pipe(
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
                          forumForum.defaultForumImage = of(defaultForumImage);
                        else {
                          let tempImage = {
                            url: '../../../assets/defaultTiny.jpg'
                          };
                          forumForum.defaultForumImage = of(tempImage);
                        }

                        if (defaultRegistrant)
                          forumForum.defaultRegistrant = of(defaultRegistrant);
                        else
                          forumForum.defaultRegistrant = of(null);

                        return of(forumForum);
                      })
                    );
                  });

                  return zip(...observables, (...results) => {
                    return results;
                  });
                }
                else return of([]);
              })
            );

            // forum registrants
            that.registrants = that.userForumRegistrantService.getRegistrants(forum.uid, forum.forumId).pipe(
              switchMap(registrants => {
                if (registrants && registrants.length > 0) {
                  let observables = registrants.map(registrant => {
                    let getService$ = that.userServiceService.getService(registrant.uid, registrant.serviceId);
                    let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(registrant.uid, registrant.serviceId).pipe(
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

                    return combineLatest([getService$, getDefaultServiceImage$]).pipe(
                      switchMap(results => {
                        const [service, defaultServiceImage] = results;

                        if (service){
                          if (defaultServiceImage)
                            service.defaultServiceImage = of(defaultServiceImage);
                          else {
                            let tempImage = {
                              url: '../../../assets/defaultTiny.jpg'
                            };
                            service.defaultServiceImage = of(tempImage);
                          }
                          return of(service);
                        }
                        else return of(null);
                      })
                    );
                  });

                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      if (result)
                        registrants[i].service = of(result);
                      else
                        registrants[i].service = of(null);
                        
                      return registrants[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            // forum posts
            that._postsSubscription = that.userForumPostService.getPosts(forum.uid, forum.forumId).pipe(
              switchMap(posts => {
                if (posts && posts.length > 0) {
                  let observables = posts.map(post => {
                    let getService$ = that.userServiceService.getService(post.serviceUid, post.serviceId);
                    let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(post.serviceUid, post.serviceId).pipe(
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

                    return combineLatest([getService$, getDefaultServiceImage$]).pipe(
                      switchMap(results => {
                        const [service, defaultServiceImage] = results;

                        if (service){
                          if (defaultServiceImage)
                            service.defaultServiceImage = of(defaultServiceImage);
                          else {
                            let tempImage = {
                              url: '../../../assets/defaultTiny.jpg'
                            };
                            service.defaultServiceImage = of(tempImage);
                          }
                          return of(service);
                        }
                        else return of(null);
                      })
                    );
                  });
                  
                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      if (result)
                        posts[i].service = of(result);
                      else
                        posts[i].service = of(null);
                      return posts[i];
                    });
                  });
                }
                else return of([]);
              })
            )
            .subscribe(posts => {
              if (posts && posts.length > 0)
                that.posts = of(_.orderBy(posts, ['creationDate'], ['asc']));
              else
                that.posts = of([]);
            });

            // listen for new posts added to the forum and sound an alert to the end user
            that._newPostsRef = that.db.database.ref(`users/${forum.uid}/forums/${forum.forumId}/posts`);

            // get a unique timestamp from the server and listen from this moment onwards
            const startKey = that._newPostsRef.push().key;

            // listen for when a new post has been added to the posts collection
            // then play a sound alerting the end user
            that._newPostsCallback = that._newPostsRef.orderByKey().startAt(startKey).on('child_added', (snap) => {
              let nopromise = {
                catch : new Function()
              };

              that.audioSound.nativeElement.pause();
              that.audioSound.nativeElement.currentTime = 0;
              (that.audioSound.nativeElement.play() || nopromise).catch(() => {});
            });

            // populate the end user registrants so that the end user can chose a pseudonym or service to post as
            that._userRegistrantsSubscription = that.userForumRegistrantService.getUserRegistrants(forum.uid, forum.forumId, that.auth.uid).pipe(
              switchMap(registrants => {
                if (registrants && registrants.length > 0) {
                  let observables = registrants.map(registrant => {
                    let getService$ = that.userServiceService.getService(registrant.uid, registrant.serviceId);
  
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
            )
            .subscribe(registrants => {
              if (registrants.length > 0) {
                // set default registrant
                registrants.forEach((registrant, i) => {
                  if (registrant.default == true)
                    that.defaultSelectedRegistrant = registrant;
                });
                that.userRegistrants = of(registrants);
                that.userRegistrantsCtrl.setValue(that.defaultSelectedRegistrant);
              }
              else that.userRegistrants = of([]);
            });

            // get default forum image
            that.getDefaultForumImage();
          }
          catch (error) {
            throw error;
          }
        }

        // call load
        load().then(() => {
          // inform listeners that the view forum page is viewing this forum
          this.messageSharingService.changeViewForumId(this.forumId);
                    
          this._loading.next(false);
          runOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }

  userRegistrantsCompareFn (c1: any, c2: any): boolean {
    if (c1 && c2){
      if (c1.registrantId === c2.registrantId)
        return true;
      else
        return false;
    }
    else return false;
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded'){
      this.descriptionPanelTitle.nativeElement.style.display = "none";
    }
    else {
      this.descriptionPanelTitle.nativeElement.style.display = "block";
    }
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
    this._defaultForumImageSubscription = this.userForumImageService.getDefaultForumImages(this.userId, this.forumId).pipe(
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

  sendMessage () {
    const that = this;

    if (this._talkingToServer == false){
      this._talkingToServer = true;

      this.userForumRegistrantService.serviceIsServingInForumFromPromise(this.userId, this.forumId, this.defaultSelectedRegistrant.serviceId)
        .then((isServing) => {
          if (isServing) {
            if (this.newMessageCtrl.value.length > 0){
              let post: Post = {
                postId: '',
                forumId: this.forumId,
                forumUid: this.userId,
                registrantId: this.defaultSelectedRegistrant.registrantId,
                serviceId: this.defaultSelectedRegistrant.serviceId,
                serviceUid: this.defaultSelectedRegistrant.uid,
                imageId: '',
                imageUid: '',
                message: this.newMessageCtrl.value,
                lastUpdateDate: firebase.database.ServerValue.TIMESTAMP,
                creationDate: firebase.database.ServerValue.TIMESTAMP
              };

              // empty message
              that.newMessageCtrl.setValue('');

              this.userForumPostService.create(this.userId, this.forumId, post).then(() => {
                setTimeout(() => {
                  this._talkingToServer = false;
                }, 300);
              })
              .catch(error => {
                this._talkingToServer = false;

                const snackBarRef = that.snackbar.openFromComponent(
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
        })
        .catch((error) => {
          console.log('sendMessage error ' + error);
          this._talkingToServer = false;
        }
      );
    }
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

  blockRegistrant (event, registrant) {
    if (this._talkingToServer == false){
      this._talkingToServer = true;

      if (event.value == 'Remove'){
        this.userForumRegistrantService.delete(this.userId, this.forumId, registrant.serviceId).then(() => {
          this.userActivityService.removeRegistrant(registrant.uid, this.forumId, registrant).then(() => {
            setTimeout(() => {
              this._talkingToServer = false;
            }, 300);
          })
          .catch(error => {
            console.log('blockRegistrant error ' + error);
            this._talkingToServer = false;
          });
        })
        .catch(error => {
          console.log('blockRegistrant error ' + error);
          this._talkingToServer = false;
        });
      }
      else if (event.value == 'Block Service'){
        const serviceBlock: ServiceBlock = {
          serviceBlockId: '',
          serviceId: registrant.serviceId,
          serviceUid: registrant.uid,
          forumId: this.forumId,
          forumUid: this.userId,
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
          creationDate: firebase.firestore.FieldValue.serverTimestamp()
        };

        this.userServiceBlockService.create(this.userId, this.forumId, registrant.serviceId, serviceBlock).then(() => {
          setTimeout(() => {
            this._talkingToServer = false;
          }, 300);
        })
        .catch(error => {
          console.log('blockRegistrant error ' + error);
          this._talkingToServer = false;
        });
      }
      else { // Block User
        const serviceUserBlock: ServiceUserBlock = {
          serviceUserBlockId: '',
          userId: registrant.uid,
          serviceId: registrant.serviceId,
          forumId: this.forumId,
          forumUid: this.userId,
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
          creationDate: firebase.firestore.FieldValue.serverTimestamp()
        };

        this.userServiceUserBlockService.create(this.userId, this.forumId, registrant.uid, serviceUserBlock).then(() => {
          setTimeout(() => {
            this._talkingToServer = false;
          }, 300);
        })
        .catch(error => {
          console.log('blockRegistrant error ' + error);
          this._talkingToServer = false;
        });
      }
    } 
  }

  changeUserRegistrant (event) {
    if (this._talkingToServer == false){
      this._talkingToServer = true;

      let updatedRegistrant: Registrant = {
        registrantId: event.value.registrantId,
        parentId: event.value.parentId,
        serviceId: event.value.serviceId,
        uid: event.value.uid,
        forumId: event.value.forumId,
        forumUid: event.value.forumUid,
        default: true,
        indexed: event.value.indexed,
        lastUpdateDate: event.value.lastUpdateDate,
        creationDate: event.value.creationDate
      }
  
      this._userRegistrantsSubscription.unsubscribe();
      this._defaultRegistrantSubscription.unsubscribe();
  
      this.userForumRegistrantService.update(this.userId, this.forumId, event.value.registrantId, updatedRegistrant)
        .then(() => {
          // populate the users registrants so that they can chose a pseudonym or service to serve as
          this._userRegistrantsSubscription = this.userForumRegistrantService.getUserRegistrants(this.userId, this.forumId, this.auth.uid).pipe(
            switchMap(registrants => {
              if (registrants && registrants.length > 0){
                let observables = registrants.map(registrant => {
                  let getService$ = this.userServiceService.getService(registrant.uid, registrant.serviceId);
      
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
          )
          .subscribe(registrants => {
            setTimeout(() => {
              this._talkingToServer = false;
            }, 300);
            
            if (registrants.length > 0){
              // set the default registrant
              registrants.forEach((registrant, i) => {
                if (registrant.default == true)
                  this.defaultSelectedRegistrant = registrant;
              });
              this.userRegistrants = of(registrants);
              this.userRegistrantsCtrl.setValue(this.defaultSelectedRegistrant);
            }
          });
        })
        .catch((error) => {
          console.log('changeUserRegistrant error ' + error);
          this._talkingToServer = false;
        }
      );
    }
  }

  removeRegistrant (registrant) {
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    // VALIDATE THIS REMOVAL
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    if (this._talkingToServer == false){
      this._talkingToServer = true;

      this.userForumRegistrantService.delete(this.userId, this.forumId, registrant.serviceId).then(() => {
        this.userActivityService.removeRegistrant(registrant.uid, this.forumId, registrant)
          .then(() => {
            setTimeout(() => {
              this._talkingToServer = false;
            }, 300);
          }
        ).catch(error => {
          console.log('removeRegistrant error ' + error);
          this._talkingToServer = false;
        });
      })
      .catch(error => {
        console.log('removeRegistrant error ' + error);
        this._talkingToServer = false;
      });
    }
  }

  removeForumForum (forum) {
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    // VALIDATE THIS REMOVAL
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    if (this._talkingToServer == false){
      this._talkingToServer = true;

      this.userForumForumService.delete(this.userId, this.forumId, forum.forumId).then(() => {
        this._talkingToServer = false;
      })
      .catch(error => {
        this._talkingToServer = false;
      });
    }
  }

  removePost (post) {
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    // VALIDATE THIS REMOVAL
    // ******************************************************************
    // ******************************************************************
    // ******************************************************************
    if (this._talkingToServer == false){
      this._talkingToServer = true;

      this.userForumPostService.delete(this.userId, this.forumId, post.postId)
        .then(() => {
          setTimeout(() => {
            this._talkingToServer = false;
          }, 300);
        }
      ).catch(error => {
        console.log('removePost error ' + error);
        
        setTimeout(() => {
          this._talkingToServer = false;
        }, 300);
      });
    }
  }

  isYou (uid) {
    if(uid == this.auth.uid)
      return true;
    else
      return false;
  }

  isMe (uid) {
    if(uid == this.auth.uid)
      return false;
    else
      return true;
  }

  public navigateBack () {
    this.location.back();
  }
}