import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';
import { AngularFireDatabase } from '@angular/fire/database';
import { AuthService } from '../../core/auth.service';
import {
  SiteTotalService,
  UserActivityService,
  UserServiceService,
  UserForumService,
  UserForumPostService,
  UserForumImageService,
  UserServiceImageService,
  UserForumBlockService,
  UserForumUserBlockService,
  UserForumRegistrantService,
  MessageSharingService,
  ForumBlock,
  ForumUserBlock
} from '../../shared';

import { Observable, Subscription, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'activity-open',
  templateUrl: './user.activity.open.component.html',
  styleUrls: ['./user.activity.open.component.css']
})
export class UserActivityOpenComponent implements OnInit, OnDestroy {
  @ViewChild('audioSound', { static: false }) audioSound: ElementRef;
  private _userTotalSubscription: Subscription;
  private _subscription: Subscription;
  private _viewForumIdSubscription: Subscription;
  private _viewForumId: string = '';

  public userTotal: Observable<any>;
  public blockTypes: string[] = ['Remove', 'Block Forum', 'Block User'];
  public activities: Observable<any[]>;

  constructor(private db: AngularFireDatabase,
    public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userForumPostService: UserForumPostService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumBlockService: UserForumBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userForumRegistrantService: UserForumRegistrantService,
    private messageSharingService: MessageSharingService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  setActivityHighlight(activity) {
    setTimeout(() => {
      if (activity.highlightPost == true){
        this.userActivityService.update(activity.uid, activity.forumId, { highlightPost: false });
      }
    }, 1000);
  }

  changeActivitySideBar () {
    if (this.auth.uid.length > 0)
      this.messageSharingService.changeActivitySideBarState(!this.messageSharingService.activitySideBarStateSource.getValue());
  }

  removeActivity (activity) {
    this.userActivityService.delete(this.auth.uid, activity.forumId);
  }

  changeReceivePosts (activity) {
    this.userActivityService.update(this.auth.uid, activity.forumId, { receivePosts: !activity.receivePosts } );
  }

  changeType (activity) {
    this.userForumService.getForumFromPromise(activity.uid, activity.forumId)
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
              data: `Forum with forumId ${activity.forumId} does not exist or was removed`,
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

  blockForum (event, forum) {
    this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(forum.uid, forum.forumId, this.auth.uid)
      .then(registrant => {
        if (registrant){
          if (event.value == 'Remove')
            this.userActivityService.delete(registrant.uid, forum.forumId);
          else if (event.value == 'Block Forum'){
            this.userActivityService.delete(registrant.uid, forum.forumId).then(() => {
              const forumBlock: ForumBlock = {
                forumBlockId: '',
                forumId: forum.forumId, // forum being blocked
                forumUid: forum.uid,
                serviceId: registrant.serviceId,
                serviceUid: registrant.uid,
                lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                creationDate: firebase.firestore.FieldValue.serverTimestamp()
              };
              this.userForumBlockService.create(registrant.uid, registrant.serviceId, forum.forumId, forumBlock);
            });
          }
          else if (event.value == 'Block User'){
            const forumUserBlock: ForumUserBlock = {
              forumUserBlockId: '',
              userId: forum.uid,
              forumId: forum.forumId,
              serviceId: registrant.serviceId,
              serviceUid: registrant.uid,
              lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
              creationDate: firebase.firestore.FieldValue.serverTimestamp()
            };
            this.userForumUserBlockService.create(registrant.uid, registrant.serviceId, forum.uid, forumUserBlock);
          }
        }
      }
    )
    .catch(error => {
      console.error(error);
    });
  }

  ngOnDestroy () {
    if (this._userTotalSubscription)
      this._userTotalSubscription.unsubscribe();

    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._viewForumIdSubscription)
      this._viewForumIdSubscription.unsubscribe();
  }

  trackActivities (index, activity) { return activity.lastUpdateDate; }

  ngOnInit () {
    this._viewForumIdSubscription = this.messageSharingService.viewForumId.subscribe(forumId => {
      if (forumId)
        this._viewForumId = forumId;
      else
        this._viewForumId = '';
    });

    // get user total
    this._userTotalSubscription = this.siteTotalService.getTotal(this.auth.uid)
      .subscribe(total => {
        if (total)
          this.userTotal = of(total);
        else {
          let total = {
            activityCount: 0,
            forumCount: 0,
            serviceCount: 0,
            notificationCount: 0,
            imageCount: 0,
            forumNotificationCount: 0,
            serviceNotificationCount: 0,
            tagCount: 0,
            alertCount: 0,
            forumAlertCount: 0,
            serviceAlertCount: 0,
            forumBlockCount: 0,
            serviceBlockCount: 0,
            forumUserBlockCount: 0,
            serviceUserBlockCount: 0
          };
          this.userTotal = of(total);
        }
      }
    );

    this._subscription = this.userActivityService.getActivities(this.auth.uid).pipe(
      switchMap(activities => {
        if (activities && activities.length > 0){
          let activitiesObservables = activities.map(activity => {
            // get the image for this forum
            let getDefaultForumImage$ = this.userForumImageService.getDefaultForumImages(activity.uid, activity.forumId).pipe(
              switchMap(forumImages => {
                if (forumImages && forumImages.length > 0){
                  if (!forumImages[0].tinyDownloadUrl)
                    forumImages[0].tinyDownloadUrl = '../../../assets/defaultTiny.jpg';

                  return of(forumImages[0]);
                }
                else return of(null);
              })
            );

            // subscribe to any newly create forum posts
            let getLastPosts$ = this.userForumPostService.getLastPosts(activity.uid, activity.forumId, 1).pipe(
              switchMap(posts => {
                if (posts && posts.length > 0){
                  let observables = posts.map(post => {
                    if (post){
                      let getService$ = this.userServiceService.getService(post.serviceUid, post.serviceId);
                      let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(post.serviceUid, post.serviceId).pipe(
                        switchMap(serviceImages => {
                          if (serviceImages && serviceImages.length > 0){
                            if (!serviceImages[0].tinyUrl)
                              serviceImages[0].tinyDownloadUrl = '../../../assets/defaultTiny.jpg';

                            return of(serviceImages[0]);
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
                                tinyDownloadUrl: '../../../assets/defaultTiny.jpg'
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

            return combineLatest([getDefaultForumImage$, getLastPosts$]).pipe(
              switchMap(results => {
                const [defaultForumImage, lastPosts] = results;

                if (lastPosts && lastPosts.length > 0)
                  activity.post = of(lastPosts[0]);
                else
                  activity.post = of(null);

                if (defaultForumImage)
                  activity.defaultForumImage = of(defaultForumImage);
                else {
                  let tempImage = {
                    tinyDownloadUrl: '../../../assets/defaultTiny.jpg'
                  };
                  activity.defaultForumImage = of(tempImage);
                }
                return of(activity);
              })
            );
          });

          return zip(...activitiesObservables, (...results) => {
            return results.map((result, i) => {
              if (result)
                activities[i].forum = of(result);
              else
                activities[i].forum = null;

              return activities[i];
            });
          });
        }
        else return of([]);
      })
    ).subscribe(activities => {
      if (activities && activities.length > 0)
        this.activities = of(activities);
      else
        this.activities = of([]);
    });
  }
}
