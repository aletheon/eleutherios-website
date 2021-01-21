import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
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
  TagService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-list',
  templateUrl: './user.forum.list.component.html',
  styleUrls: ['./user.forum.list.component.css']
})
export class UserForumListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _siteTotalSubscription: Subscription;
  private _forumSearchSubscription: Subscription;
  private _tempSearchTags: string[] = [];

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
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userForumTagService: UserForumTagService,
    private userForumImageService: UserForumImageService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userForumPostService: UserForumPostService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userForumService: UserForumService,
    private tagService: TagService,
    private snackbar: MatSnackBar,
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

      this._forumSearchSubscription = this.searchForumCtrl.valueChanges.pipe(
        startWith('')
      )
      .subscribe(searchTerm => {
        this.getForumsList(searchTerm);
      });
    }

  ngOnDestroy () {
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
    // stick this in to fix authguard issue of reposting back to this page???
    if (this.auth.uid.length == 0)
      return false;
      
    this.nextKey = null;
    this.prevKeys = [];
    this.includeTagsInSearch = true;
    this.forumGroup = this.fb.group({
      includeTagsInSearch: ['']
    });
    this.forumGroup.get('includeTagsInSearch').setValue(this.includeTagsInSearch);

    this._siteTotalSubscription = this.siteTotalService.getTotal(this.auth.uid)
      .subscribe(total => {
        if (total){
          if (total.forumCount == 0)
            this._total.next(-1);
          else
            this._total.next(total.forumCount);
        }
      }
    );
    this.getForumsList();
  }

  getForumsList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    if (this.searchForumCtrl.value && this.searchForumCtrl.value.length > 0){
      if (!key)
        key = this.searchForumCtrl.value;

      this._subscription = this.userForumService.getForumsSearchTerm(this.auth.uid, this.numberOfItems, key, this._tempSearchTags, this.includeTagsInSearch, false).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
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
                );

                return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, forumTags, defaultRegistrant] = results;
      
                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultThumbnail.jpg'
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
      this._subscription = this.userForumService.getAllForums(this.auth.uid, this.numberOfItems, key, this._tempSearchTags, this.includeTagsInSearch, false).pipe(
        switchMap(forums => {
          if (forums && forums.length > 0){
            let observables = forums.map(forum => {
              if (forum){
                let getForumTags$ = this.userForumTagService.getTags(forum.uid, forum.forumId);
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
                );

                // subscribe to any newly create forum posts
                let getLastPosts$ = this.userForumPostService.getLastPosts(forum.uid, forum.forumId, 1).pipe(
                  switchMap(posts => {
                    if (posts && posts.length > 0){
                      let observables = posts.map(post => {
                        if (post){
                          let getService$ = this.userServiceService.getService(post.serviceUid, post.serviceId);
                          let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(post.serviceUid, post.serviceId).pipe(
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
                                post.service = of(service);
                              }
                              else post.service = of(null);                                    
                              return of(post);
                            })
                          );
                        }
                        else return of(null);
                      });
                  
                      return zip(...observables, (...results) => {
                        return results.map((result, i) => {
                          return posts[i];
                        });
                      });
                    }
                    else return of([]);
                  })
                );

                return combineLatest([getDefaultForumImage$, getForumTags$, getDefaultRegistrant$, getLastPosts$]).pipe(
                  switchMap(results => {
                    const [defaultForumImage, forumTags, defaultRegistrant, lastPosts] = results;
                    
                    if (defaultForumImage)
                      forum.defaultForumImage = of(defaultForumImage);
                    else {
                      let tempImage = {
                        url: '../../../assets/defaultThumbnail.jpg'
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

                    if (lastPosts && lastPosts.length > 0)
                      forum.post = of(lastPosts[0]);
                    else
                      forum.post = of(null);

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