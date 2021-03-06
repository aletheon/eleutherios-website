import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import { MatExpansionPanel } from '@angular/material/expansion';
import {
  AnonymousForumService,
  UserForumImageService,
  UserForumTagService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';
import { environment } from '../../../../environments/environment'

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
  private _initialForumSubscription: Subscription;
  private _forumSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;

  public defaultRegistrant: Observable<any>;
  public forum: Observable<any>;
  public forumGroup: FormGroup;
  public forumTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();
  public defaultForumImage: Observable<any>;

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
          if (!forumImages[0].smallDownloadUrl)
            forumImages[0].smallDownloadUrl = '../../../../assets/defaultThumbnail.jpg';

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
          smallDownloadUrl: '../../../../assets/defaultThumbnail.jpg'
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
      let forumId = params['forumId'] ? params['forumId'] : '';

      if (forumId.length > 0){
        // redirect user if they are already logged in
        if (this.auth.uid && this.auth.uid.length > 0){
          this.router.navigate(['/forum/detail'], { queryParams: { forumId: forumId } });
        }

        this._initialForumSubscription = this.anonymousForumService.getForum(forumId).subscribe(forum => {
          this._initialForumSubscription.unsubscribe();

          if (forum){
            this.forum = this.anonymousForumService.getForum(forumId);
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
            this.router.navigate(['/anonymous/home']);
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
