import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserForumService,
  UserServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumBlockService,
  UserForumRegistrantService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-service-forum-block-list',
  templateUrl: './user.service.forum.block.list.component.html',
  styleUrls: ['./user.service.forum.block.list.component.css']
})
export class UserServiceForumBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription: Subscription;
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public serviceForumBlocks: Observable<any[]> = of([]);
  public serviceForumBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumBlockService: UserForumBlockService,
    private userForumRegistrantService: UserForumRegistrantService,
    private route: ActivatedRoute,
    private router: Router) {
    }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceForumBlocks (index, forumBlock) { return forumBlock.forumBlockId; }

  ngOnInit () {
    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        // get params
        this.route.queryParams.subscribe((params: Params) => {
          // reset keys

          this.nextKey = null;
          this.prevKeys = [];

          this._totalSubscription = this.siteTotalService.getTotal(this.loggedInUserId)
            .subscribe(total => {
              if (total){
                if (total.forumBlockCount == 0)
                  this._total.next(-1);
                else
                  this._total.next(total.forumBlockCount);
              }
              else this._total.next(-1);
            }
          );
          this.getServiceForumBlockList();
        });
      }
    });
  }

  getServiceForumBlockList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    this._loading.next(true);

    this._subscription = this.userForumBlockService.getUserForumBlocks(this.loggedInUserId, this.numberItems, key).pipe(
      switchMap(forumBlocks => {
        if (forumBlocks && forumBlocks.length > 0){
          let observables = forumBlocks.map(forumBlock => {
            let getService$ = this.userServiceService.getService(forumBlock.serviceUid, forumBlock.serviceId).pipe(
              switchMap(service => {
                if (service) {
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0){
                        if (!serviceImages[0].tinyDownloadUrl)
                          serviceImages[0].tinyDownloadUrl = '../../../../assets/defaultTiny.jpg';

                        return of(serviceImages[0]);
                      }
                      else return of(null);
                    })
                  );

                  let getForum$ = this.userForumService.getForum(forumBlock.forumUid, forumBlock.forumId).pipe(
                    switchMap(forum => {
                      if (forum){
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
                              if (!forumImages[0].tinyDownloadUrl)
                                forumImages[0].tinyDownloadUrl = '../../../../assets/defaultTiny.jpg';

                              return of(forumImages[0]);
                            }
                            else return of(null);
                          })
                        );

                        return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                          switchMap(results => {
                            const [defaultForumImage, defaultRegistrant] = results;

                            if (defaultForumImage)
                              forum.defaultForumImage = of(defaultForumImage);
                            else {
                              let tempImage = {
                                tinyDownloadUrl: '../../../../assets/defaultTiny.jpg'
                              };
                              forum.defaultForumImage = of(tempImage);
                            }

                            if (defaultRegistrant)
                              forum.defaultRegistrant = of(defaultRegistrant);
                            else
                              forum.defaultRegistrant = of(null);

                            return of(forum);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  return combineLatest([getDefaultServiceImage$, getForum$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, forum] = results;

                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          tinyDownloadUrl: '../../../../assets/defaultTiny.jpg'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }

                      if (forum)
                        service.forum = of(forum);
                      else
                        service.forum = of(null);

                      return of(service);
                    })
                  );
                }
                else return of(null);
              })
            );

            return combineLatest([getService$]).pipe(
              switchMap(results => {
                const [service] = results;

                if (service)
                  forumBlock.service = of(service);
                else {
                  forumBlock.service = of(null);
                }
                return of(forumBlock);
              })
            );
          });
          return zip(...observables);
        }
        else return of([]);
      })
    )
    .subscribe(forumBlocks => {
      this.serviceForumBlocksArray = _.slice(forumBlocks, 0, this.numberItems);
      this.serviceForumBlocks = of(this.serviceForumBlocksArray);
      this.nextKey = _.get(forumBlocks[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (forumBlock) {
    this.userForumBlockService.delete(forumBlock.serviceUid, forumBlock.serviceId, forumBlock.forumId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.serviceForumBlocksArray)['creationDate']);
    this.getServiceForumBlockList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServiceForumBlockList(prevKey);
  }
}
