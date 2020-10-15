import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import {
  SiteTotalService,
  UserActivityService,
  UserServiceService,
  UserForumPostService,
  UserForumImageService,
  UserServiceImageService,
  MessageSharingService,
  DownloadImageUrlPipe
} from '../../shared';

import { Observable, Subscription, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'activity-closed',
  templateUrl: './user.activity.closed.component.html',
  styleUrls: ['./user.activity.closed.component.css']
})
export class UserActivityClosedComponent implements OnInit, OnDestroy {
  @ViewChild('audioSound', { static: true }) audioSound: ElementRef;
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
    private messageSharingService: MessageSharingService) {
      console.log('loading activity closed');
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
            let getDefaultForumImages$ = this.userForumImageService.getDefaultForumImages(activity.uid, activity.forumId);

            // subscribe to any newly create forum posts
            let getLastPosts$ = this.userForumPostService.getLastPosts(activity.uid, activity.forumId, 1).pipe(
              switchMap(posts => {
                if (posts && posts.length > 0){
                  let observables = posts.map(post => {
                    if (post){
                      let getService$ = this.userServiceService.getService(post.serviceUid, post.serviceId);
                      let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(post.serviceUid, post.serviceId);

                      return combineLatest([getService$, getDefaultServiceImages$]).pipe(
                        switchMap(results => {
                          const [service, defaultServiceImages] = results;

                          if (service){
                            if (defaultServiceImages && defaultServiceImages.length > 0)
                              service.defaultServiceImage = of(defaultServiceImages[0]);
                            else {
                              let tempImage = {
                                tinyUrl: '../../../assets/defaultTiny.jpg',
                                name: 'No image'
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

            return combineLatest([getDefaultForumImages$, getLastPosts$]).pipe(
              switchMap(results => {
                const [defaultForumImages, lastPosts] = results;
                
                if (lastPosts && lastPosts.length > 0){
                  activity.postMessage = lastPosts[0].message;
                  activity.postMessageDate = lastPosts[0].creationDate;
                  activity.post = of(lastPosts[0]);
                }
                else activity.post = of(null);

                if (defaultForumImages && defaultForumImages.length > 0)
                  activity.defaultForumImage = of(defaultForumImages[0]);
                else {
                  let tempImage = {
                    tinyUrl: '../../../assets/defaultTiny.jpg',
                    name: 'No image'
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

            // activity.postMessageDate

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