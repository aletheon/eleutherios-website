import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserForumService,
  UserForumTagService,
  UserForumImageService,
  UserForumRegistrantService,
  UserForumPostService,
  UserServiceService,
  UserServiceImageService,
  ForumService,
  TagService,
  NoTitlePipe,
  TruncatePipe
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap, startWith, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'forum-list',
  templateUrl: './forum.list.component.html',
  styleUrls: ['./forum.list.component.css']
})
export class ForumListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription = new Subscription;
  private _subscription: Subscription;
  private _siteTotalSubscription: Subscription;
  private _forumSearchSubscription: Subscription;
  private _tempSearchTags: string[] = [];
  private _userId: string = '';

  public forumGroup: FormGroup;
  public searchForumCtrl: FormControl;
  public forumSearchTagCtrl: FormControl;
  public numberOfItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteSearchTags: Observable<any[]>;
  public forums: Observable<any[]> = of([]);
  public forumsArray: any[] = [];
  public searchTags: any[]= [];
  public total: Observable<number> = this._total.asObservable();
  public includeTagsInSearch: boolean;
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userForumImageService: UserForumImageService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumPostService: UserForumPostService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userForumTagService: UserForumTagService,
    private forumService: ForumService,
    private tagService: TagService,
    private snackbar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder) {
      this.searchForumCtrl = new FormControl();
      this.forumSearchTagCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteSearchTags = this.forumSearchTagCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm =>
          this.tagService.search(searchTerm)
        )
      );
    }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._siteTotalSubscription)
      this._siteTotalSubscription.unsubscribe();

    if (this._forumSearchSubscription)
      this._forumSearchSubscription.unsubscribe();
  }

  trackSearchTags (index, tag) { return tag.tagId; }
  trackForums (index, forum) { return forum.forumId; }

  ngOnInit () {
    this.nextKey = null;
    this.prevKeys = [];
    this.includeTagsInSearch = true;
    this.forumGroup = this.fb.group({
      includeTagsInSearch: ['']
    });
    this.forumGroup.get('includeTagsInSearch').setValue(this.includeTagsInSearch);

    this._siteTotalSubscription = this.siteTotalService.getTotal('forum')
      .subscribe(total => {
        if (total){
          if (total.count == 0)
            this._total.next(-1);
          else
            this._total.next(total.count);
        }
      }
    );

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this._forumSearchSubscription = this.searchForumCtrl.valueChanges.pipe(
          startWith('')
        )
        .subscribe(searchTerm => {
          this.getForumsList(searchTerm);
        });
      }
    });
  }

  getForumsList (key?: any) {
    // loading
    this._loading.next(true);

    if (this.searchForumCtrl.value && this.searchForumCtrl.value.length > 0){
      if (!key)
        key = this.searchForumCtrl.value;

      this._subscription = this.forumService.getForumsSearchTerm(this.numberOfItems, key, this._tempSearchTags, this.includeTagsInSearch, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
                let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.loggedInUserId).pipe(
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
                      if (!forumImages[0].smallDownloadUrl)
                        forumImages[0].smallDownloadUrl = '../../assets/defaultThumbnail.jpg';

                      return of(forumImages[0]);
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, forumTags, defaultRegistrant] = results;

                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        smallDownloadUrl: '../../assets/defaultThumbnail.jpg'
                      };
                      forum.defaultForumImage = of(tempImage);
                    }

                    if (forumTags)
                      forum.forumTags = of(forumTags);
                    else
                      forum.forumTags = of([]);

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
      )
      .subscribe(forums => {
        this.forumsArray = _.slice(forums, 0, this.numberOfItems);
        this.forums = of(this.forumsArray);
        this.nextKey = _.get(forums[this.numberOfItems], 'title');
        this._loading.next(false);
      });
    }
    else {
      this._subscription = this.forumService.getAllForums(this.numberOfItems, key, this._tempSearchTags, this.includeTagsInSearch, true).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
                let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.loggedInUserId).pipe(
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
                      if (!forumImages[0].smallDownloadUrl)
                        forumImages[0].smallDownloadUrl = '../../assets/defaultThumbnail.jpg';

                      return of(forumImages[0]);
                    }
                    else return of(null);
                  })
                );

                return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, forumTags, defaultRegistrant] = results;

                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        smallDownloadUrl: '../../assets/defaultThumbnail.jpg'
                      };
                      forum.defaultForumImage = of(tempImage);
                    }

                    if (forumTags)
                      forum.forumTags = of(forumTags);
                    else
                      forum.forumTags = of([]);

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
      )
      .subscribe(forums => {
        this.forumsArray = _.slice(forums, 0, this.numberOfItems);
        this.forums = of(this.forumsArray);
        this.nextKey = _.get(forums[this.numberOfItems], 'creationDate');
        this._loading.next(false);
      });
    }
  }

  includeTagsInSearchClick () {
    this.includeTagsInSearch = this.forumGroup.get('includeTagsInSearch').value;
    this.getForumsList();
  }

  removeSearchTag (tag) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    // tag exists so remove it
    if (tagIndex > -1) {
      this.searchTags.splice(tagIndex, 1);
      this.searchTags.sort();
      this._tempSearchTags.splice(tagIndex, 1);
      this.getForumsList();
    }
  }

  autoSearchTagDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  searchTagsSelectionChange (tag: any) {
    const tagIndex = _.findIndex(this.searchTags, function(t) { return t.tagId == tag.tagId; });

    // tag doesn't exist so add it
    if (tagIndex == -1){
      this.searchTags.push(tag);
      this._tempSearchTags.push(tag.tag);
      this.searchTags.sort();
      this._tempSearchTags.sort();
      this.getForumsList();
    }
  }

  delete (forum) {
    this.userForumService.delete(forum.uid, forum.forumId);
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

  createNewService(forum) {
    window.localStorage.setItem('serviceForum', JSON.stringify(forum));
    this.router.navigate(['/user/service/new']);
  }

  onNext () {
    if (this.searchForumCtrl.value && this.searchForumCtrl.value.length > 0)
      this.prevKeys.push(_.first(this.forumsArray)['title']);
    else
      this.prevKeys.push(_.first(this.forumsArray)['creationDate']);

    this.getForumsList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getForumsList(prevKey);
  }
}
