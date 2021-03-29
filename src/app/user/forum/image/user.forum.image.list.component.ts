import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserForumService,
  UserForumRegistrantService,
  UserForumImageService,
  UserForumTagService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-image-list',
  templateUrl: './user.forum.image.list.component.html',
  styleUrls: ['./user.forum.image.list.component.css']
})
export class UserForumImageListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription: Subscription;
  private _initialForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _forumImagesSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _imageCount = new BehaviorSubject(0);

  public forumGroup: FormGroup;
  public forum: Observable<any>;
  public forumTags: Observable<any[]>;
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public numberOfItems: number = 1;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public forumImages: Observable<any[]> = of([]);
  public defaultForumImage: Observable<any>;
  public forumImagesArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  public defaultRegistrant: any;
  public forumId: string;
  public userId: string;
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumImageService: UserForumImageService,
    private userForumTagService: UserForumTagService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
    }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._initialForumSubscription)
      this._initialForumSubscription.unsubscribe();

    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._forumImagesSubscription)
      this._forumImagesSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackForumImages (index, forumImage) { return forumImage.forumImageId; }
  trackForumTags (index, tag) { return tag.tagId; }

  ngOnInit () {
    this.nextKey = null;
    this.prevKeys = [];
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this.route.queryParams.subscribe((params: Params) => {
          this.forumId = params['forumId'];
          this.userId = params['userId'];

          this._initialForumSubscription = this.userForumService.getForum(this.userId, this.forumId).pipe(take(1))
            .subscribe(forum => {
              if (forum){
                if (forum.uid == this.loggedInUserId){
                  this.forum = this.userForumService.getForum(this.userId, this.forumId);
                  this.initForm();
                }
                else {
                  // ensure user is serving in the forum before viewing it
                  this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userId, this.forumId, this.loggedInUserId)
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
            }
          );
        });
      }
    });
  }

  private initForm (){
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

    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum){
          this.forumGroup.patchValue(forum);

          if (forum.uid != this.loggedInUserId){
            // ensure user is serving in the forum before viewing it
            this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userId, this.forumId, this.loggedInUserId)
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
        }
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
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              }
            );

            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(that.userId, that.forumId, that.loggedInUserId)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = registrants[0];
                else
                  that.defaultRegistrant = null;
              }
            );

            // get default forum image
            that.getDefaultForumImage();

            // get forum images
            that.getForumImagesList();

            // tags for this forum
            that.forumTags = that.userForumTagService.getTags(forum.uid, forum.forumId);
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

  getForumImagesList (key?: any) {
    this._loading.next(true);

    this._forumImagesSubscription = this.userForumImageService.getForumImages(this.userId, this.forumId, this.numberOfItems, key).pipe(
      switchMap(forumImages => {
        if (forumImages && forumImages.length > 0){
          let observables = forumImages.map(forumImage => {
            let getDownloadUrl$: Observable<any>;

            if (forumImage.largeUrl)
              getDownloadUrl$ = from(firebase.storage().ref(forumImage.largeUrl).getDownloadURL());

            return combineLatest([getDownloadUrl$]).pipe(
              switchMap(results => {
                const [downloadUrl] = results;

                if (downloadUrl)
                  forumImage.url = downloadUrl;
                else
                  forumImage.url = '../../../../assets/defaultLarge.jpg';

                return of(forumImage);
              })
            );
          });

          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              return forumImages[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(forumImages => {
      this.forumImagesArray = _.slice(forumImages, 0, this.numberOfItems);
      this.forumImages = of(this.forumImagesArray);
      this.nextKey = _.get(forumImages[this.numberOfItems], 'creationDate');
      this._loading.next(false);
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
                forumImages[0].url = '../../../../assets/defaultThumbnail.jpg';

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
          url: '../../../../assets/defaultThumbnail.jpg'
        };
        this.defaultForumImage = of(tempImage);
      }
    });
  }

  onNext () {
    this.prevKeys.push(_.first(this.forumImagesArray)['creationDate']);
    this.getForumImagesList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getForumImagesList(prevKey);
  }
}
