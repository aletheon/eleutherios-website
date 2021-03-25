import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  SiteTotalService,
  UserActivityService,
  UserServiceService,
  UserForumPostService,
  UserForumImageService,
  UserServiceImageService,
  MessageSharingService
} from '../../shared';

import { Observable, Subscription, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'activity-closed',
  templateUrl: './user.activity.closed.component.html',
  styleUrls: ['./user.activity.closed.component.css']
})
export class UserActivityClosedComponent implements OnInit, OnDestroy {
  @ViewChild('audioSound', { static: false }) audioSound: ElementRef;
  private _userTotalSubscription: Subscription;
  private _subscription: Subscription;
  private _viewForumIdSubscription: Subscription;
  private _viewForumId: string = '';

  public userTotal: Observable<any>;
  public activities: Observable<any[]>;

  constructor(private auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userActivityService: UserActivityService,
    private userServiceService: UserServiceService,
    private userForumPostService: UserForumPostService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private messageSharingService: MessageSharingService,
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
            activity.fullTitle = activity.title;

            // get the image for this forum
            let getDefaultForumImage$ = this.userForumImageService.getDefaultForumImages(activity.uid, activity.forumId).pipe(
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
                            activity.serviceTitle = service.title;
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

                if (lastPosts && lastPosts.length > 0){
                  activity.postMessage = lastPosts[0].message;
                  activity.postMessageDate = lastPosts[0].creationDate;
                  activity.post = of(lastPosts[0]);
                }
                else activity.post = of(null);

                if (defaultForumImage)
                  activity.defaultForumImage = of(defaultForumImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultTiny.jpg'
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
    )
    .subscribe(activities => {
      if (activities && activities.length > 0){
        activities.forEach(activity => {
          // play highlightPost sound(s)
          // set when new posts for the forum comes in
          activity.highlight = false;

          if (activity.receivePosts == true && activity.highlightPost == true){
            let nopromise = {
              catch : new Function()
            };

            // augment activity.highlightPost so real-time updates
            // don't interfere with the css highlighting process
            activity.highlight = true;
            activity.fullTitle = `${activity.title} - ${activity.serviceTitle} said: ${activity.postMessage}`;

            // make sure the user is not on the view forum page (user redundancy)
            if (this._viewForumId != activity.forumId){
              this.audioSound.nativeElement.pause();
              this.audioSound.nativeElement.currentTime = 0;
              (this.audioSound.nativeElement.play() || nopromise).catch(() => {});
            }
            else activity.highlight = false;
          }
        })
        this.activities = of(activities);
      }
      else this.activities = of([]);
    });
  }
}
