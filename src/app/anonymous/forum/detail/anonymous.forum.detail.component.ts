import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import { NgxQrcodeElementTypes, NgxQrcodeErrorCorrectionLevels } from '@techiediaries/ngx-qrcode';
import {
  AnonymousForumService,
  UserForumImageService,
  UserForumTagService,
  NoTitlePipe
} from '../../../shared';
import { environment } from '../../../../environments/environment';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'anonymous-forum-detail',
  templateUrl: './anonymous.forum.detail.component.html',
  styleUrls: ['./anonymous.forum.detail.component.css']
})
export class AnonymousForumDetailComponent implements OnInit, OnDestroy {
  @ViewChild('descriptionPanel', { static: false }) _descriptionPanel: MatExpansionPanel;
  @ViewChild('descriptionPanelTitle', { static: false }) _descriptionPanelTitle: ElementRef;

  private _loading = new BehaviorSubject(false);
  private _forumSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;

  public defaultRegistrant: Observable<any>;
  public forum: Observable<any>;
  public forumGroup: FormGroup;
  public forumTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();
  public defaultForumImage: Observable<any>;
  public qrCodeUrl: string = '';
  public elementType = NgxQrcodeElementTypes.URL;
  public correctionLevel = NgxQrcodeErrorCorrectionLevels.HIGH;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private anonymousForumService: AnonymousForumService,
    private userForumImageService: UserForumImageService,
    private userForumTagService: UserForumTagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  descriptionPanelEvent (state: string) {
    if (state == 'expanded')
      this._descriptionPanelTitle.nativeElement.style.display = "none";
    else
      this._descriptionPanelTitle.nativeElement.style.display = "block";
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

  trackForumTags (index, forumTag) { return forumTag.tagId; }

  ngOnDestroy () {
    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();
  }

  ngOnInit () {
    // redirect user if they are already logged in
    if (this.auth.uid && this.auth.uid.length > 0)
      this.router.navigate(['/']);
      
    // get params
    const that = this;

    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let forumId = params['forumId'];

      if (forumId){
        // redirect user if they are already logged in
        if (this.auth.uid && this.auth.uid.length > 0){
          this.router.navigate(['/forum/detail'], { queryParams: { forumId: forumId } });
        }

        this.anonymousForumService.getForumFromPromise(forumId)
          .then(forum => {
            if (forum){
              this.forum = this.anonymousForumService.getForum(forumId);
              this.initForm();
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'Forum does not exist or was recently removed 1',
                  panelClass: ['red-snackbar']
                }
              );
              this.router.navigate(['/anonymous/home']);
            }
          }
        ).catch(error => {
          console.error(error);
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
        that.router.navigate(['/']);
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
            // get the tags for this forum
            that.forumTags = that.userForumTagService.getTags(forum.uid, forum.forumId);

            // get default forum image
            that.getDefaultForumImage();

            that.qrCodeUrl = environment.url + "anonymous/forum/detail?forumId=" + forum.forumId;
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
}