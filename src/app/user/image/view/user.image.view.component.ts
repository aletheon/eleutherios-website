import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  UserImageService,
  NoTitlePipe,
  TruncatePipe,
  Image
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-image-view',
  templateUrl: './user.image.view.component.html',
  styleUrls: ['./user.image.view.component.css']
})
export class UserImageViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _subscription: Subscription;
  private _imageId: string;
  private _image: Observable<any>;

  public image: Observable<any>;
  public nextKeyQuerystring: Observable<any>;
  public prevKeyQuerystring: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute, 
    private userImageService: UserImageService,
    private router: Router,
    private snackbar: MatSnackBar) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();
  }

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
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let nextKey = params['nextKey'];
      let prevKey = params['prevKey'];

      if (nextKey)
        this.nextKeyQuerystring = of(nextKey);

      if (prevKey)
        this.prevKeyQuerystring = of(prevKey);

      if (params['imageId'] && params['imageId'].length > 0){
        this._imageId = params['imageId'];
        this._image = this.userImageService.getImage(this.auth.uid, this._imageId).pipe(
          switchMap(image => {
            if (image){
              let getDownloadUrl$: Observable<any>;

              if (image.largeUrl)
                getDownloadUrl$ = from(firebase.storage().ref(image.largeUrl).getDownloadURL());

              return combineLatest([getDownloadUrl$]).pipe(
                switchMap(results => {
                  const [downloadUrl] = results;
                  
                  if (downloadUrl)
                    image.url = downloadUrl;
                  else
                    image.url = '../../../assets/defaultLarge.jpg';
    
                  return of(image);
                })
              );
            }
            else return of(null);
          })
        );
        this.initForm();
      }
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'There was no imageId provided',
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/']);
      }
    });
  }

  private initForm () {
    this._subscription = this._image
      .subscribe(image => {
        if (!image){
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Image was not found or was removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
        else {
          if (image.uid != this.auth.uid){
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `You don't have permission to view this image`,
                panelClass: ['red-snackbar']
              }
            );
            this.router.navigate(['/']);
          }
          else this.image = of(image);
        }
      }
    );

    // run once subscription
    const runOnceSubscription = this._image.subscribe(image => {
      if (image){
        let load = async function(){
          try {
            // initialize other stuff here ...
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
          console.error(error);
        });
      }
    });
  }
}