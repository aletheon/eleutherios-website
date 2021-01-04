import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  AnonymousForumService,
  UserForumImageService,
  UserForumTagService,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, from, combineLatest } from 'rxjs';
import * as firebase from 'firebase/app';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'anonymous-forum-image-list',
  templateUrl: './anonymous.forum.image.list.component.html',
  styleUrls: ['./anonymous.forum.image.list.component.css']
})
export class AnonymousForumImageListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _forumImagesSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
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
  public forumUid: string;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private anonymousForumService: AnonymousForumService,
    private userForumImageService: UserForumImageService,
    private userForumTagService: UserForumTagService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackForumImages (index, forumImage) { return forumImage.forumImageId; }
  trackForumTags (index, tag) { return tag.tagId; }

  ngOnInit () {
    // redirect user if they are already logged in
    if (this.auth.uid && this.auth.uid.length > 0)
      this.router.navigate(['/']);
      
    this.nextKey = null;
    this.prevKeys = [];
    this.forumGroup = this.fb.group({
      forumId: '',
      uid: ''
    });
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      if (params['forumId'] && params['forumId'].length > 0){
        this.forumGroup.get('forumId').setValue(params['forumId']);

        // ensure forum exists
        this.anonymousForumService.getForumFromPromise(this.forumGroup.get('forumId').value)
          .then(forum => {
            if (forum){
              this.forum = this.anonymousForumService.getForum(this.forumGroup.get('forumId').value);
              this.initForm();
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'Forum does not exist or was recently removed 2',
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/anonymous/home']);
            }
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
          this.router.navigate(['/anonymous/home']);
        });
      }
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'There was no forumId provided',
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/anonymous/home']);
      }
    });
  }

  private initForm (){
    const that = this;

    this._subscription = this.forum
      .subscribe(forum => {
        if (forum)
          this.forumGroup.patchValue(forum);
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'The forum no longer exists or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/anonymous/home']);
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
                if (total){
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
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
    if (this._forumImagesSubscription)
      this._forumImagesSubscription.unsubscribe();

    this._loading.next(true);

    this._forumImagesSubscription = this.userForumImageService.getForumImages(this.forumGroup.get('uid').value, this.forumGroup.get('forumId').value, this.numberOfItems, key).pipe(
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
    
          return zip(...observables, (...results: any[]) => {
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
    })
  }

  getDefaultForumImage () {
    // default forum image
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
    })
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