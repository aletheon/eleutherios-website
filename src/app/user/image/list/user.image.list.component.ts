import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import {
  SiteTotalService,
  UserImageService,
  PreviousRouteService,
  NoTitlePipe,
  DownloadImageUrlPipe,
  TruncatePipe,
  Image
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-image-list',
  templateUrl: './user.image.list.component.html',
  styleUrls: ['./user.image.list.component.css']
})
export class UserImageListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public images: Observable<any[]> = of([]);
  public imagesArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userImageService: UserImageService,
    private previousRouteService: PreviousRouteService,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackImages (index, image) { return image.imageId; }

  changeImageName (image, newName: string) {
    if (image.name.trim() != newName.trim()){
      let updatedImage: Image = {
        imageId: image.imageId,
        uid: image.uid,
        name: newName.trim(),
        filePath: image.filePath,
        tinyUrl: image.tinyUrl,
        smallUrl: image.smallUrl,
        mediumUrl: image.mediumUrl,
        largeUrl: image.largeUrl,
        default: image.default,
        lastUpdateDate: image.lastUpdateDate,
        creationDate: image.creationDate
      };

      this.userImageService.update(image.uid, image.imageId, updatedImage).then(() => {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 5000,
            data: 'Image saved',
            panelClass: ['green-snackbar']
          }
        );
      })
      .catch(error => {
        console.log('changeImageName error ' + error);
      });
    }
  }

  ngOnInit () {
    let previousRouteUrl = this.previousRouteService.getPreviousUrl();
    let prevKeys = [];
    let nextKey = null

    if (window.localStorage.getItem('userImageListPrevKeys'))
      prevKeys = JSON.parse(window.localStorage.getItem('userImageListPrevKeys'));

    if (window.localStorage.getItem('userImageListNextKey'))
      nextKey = JSON.parse(window.localStorage.getItem('userImageListNextKey'));

    window.localStorage.removeItem('userImageListPrevKeys');
    window.localStorage.removeItem('userImageListNextKey');
    
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys
      this.nextKey = null;
      this.prevKeys = [];

      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.imageCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.imageCount);
          }
        }
      );

      // restore prevKeys if user came from image view page
      if (previousRouteUrl.length > 0 && previousRouteUrl.indexOf('/user/image/view') == 0){
        if (prevKeys.length > 0)
          this.prevKeys = prevKeys;

        if (nextKey)
          this.getImageList(new firebase.firestore.Timestamp(nextKey.seconds, nextKey.nanoseconds));
        else
          this.getImageList();
      }
      else this.getImageList();
    });
  }

  getImageList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userImageService.getImages(this.auth.uid, this.numberItems, key).pipe(
      switchMap(images => {
        if (images && images.length > 0){
          let observables = images.map(image => {
            if (image){
              let getImageTotal$ = this.siteTotalService.getTotal(image.imageId);

              return combineLatest(getImageTotal$).pipe(
                switchMap(results => {
                  const [imageTotal] = results;
                  
                  if (imageTotal){
                    image.forumCount = imageTotal.forumCount;
                    image.serviceCount = imageTotal.serviceCount;
                  }
                  else {
                    image.forumCount = 0;
                    image.serviceCount = 0;
                  }                  
                  return of(image);
                })
              );
            }
            else return of(null);
          });
    
          return combineLatest(...observables, (...results) => {
            return results.map((result, i) => {
              return images[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(images => {
      this.imagesArray = _.slice(images, 0, this.numberItems);
      this.images = of(this.imagesArray);
      this.nextKey = _.get(images[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (image) {
    const imageTotalSubscription = this.siteTotalService.getTotal(image.imageId)
      .subscribe(total => {
        if (total.forumCount == 0 && total.serviceCount == 0){
          this.userImageService.delete(this.auth.uid, image.imageId).then(() =>{
            // do something
          })
          .catch(error =>{
            const snackBarRef =this.snackbar.openFromComponent(
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
          let message = "Cannot remove the image, it is being used by ";

          if (total.forumCount > 0)
            message += `${total.forumCount} forum(s), `;
          
          if (total.serviceCount > 0)
            message += `${total.serviceCount} service(s), `;

          message = message.substring(0, message.length-2) + '.';

          const snackBarRef =this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: message,
              panelClass: ['red-snackbar']
            }
          );
        }
        imageTotalSubscription.unsubscribe();
      }
    );
  }

  onNext () {
    this.prevKeys.push(_.first(this.imagesArray)['creationDate']);
    window.localStorage.setItem('userImageListPrevKeys', JSON.stringify(this.prevKeys));
    window.localStorage.setItem('userImageListNextKey', JSON.stringify(this.nextKey));
    this.getImageList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key

    if (this.prevKeys.length > 0)
      window.localStorage.setItem('userImageListPrevKeys', JSON.stringify(this.prevKeys));
    else
      window.localStorage.removeItem('userImageListPrevKeys');

    if (window.localStorage.getItem('userImageListNextKey')){
      let nextKey = JSON.parse(window.localStorage.getItem('userImageListNextKey'));

      // we are at the start of the page list so remove nextKey from storage
      if (nextKey.seconds == prevKey.seconds && nextKey.nanoseconds == prevKey.nanoseconds)
        window.localStorage.removeItem('userImageListNextKey');
    }
    this.getImageList(new firebase.firestore.Timestamp(prevKey.seconds, prevKey.nanoseconds));
  }
}