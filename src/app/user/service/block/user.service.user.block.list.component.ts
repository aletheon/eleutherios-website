import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserForumService,
  UserForumImageService,
  UserServiceUserBlockService,
  UserService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-service-user-block-list',
  templateUrl: './user.service.user.block.list.component.html',
  styleUrls: ['./user.service.user.block.list.component.css']
})
export class UserServiceUserBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription: Subscription;
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public serviceUserBlocks: Observable<any[]> = of([]);
  public serviceUserBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userForumImageService: UserForumImageService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userService: UserService,
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

  trackServiceUserBlocks (index, userBlock) { return userBlock.serviceUserBlockId; }

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
                if (total.serviceUserBlockCount == 0)
                  this._total.next(-1);
                else
                  this._total.next(total.serviceUserBlockCount);
              }
              else this._total.next(-1);
            }
          );
          this.getServiceUserBlockList();
        });
      }
    });
  }

  getServiceUserBlockList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userServiceUserBlockService.getServiceUserBlocks(this.loggedInUserId, this.numberItems, key).pipe(
      switchMap(serviceUserBlocks => {
        if (serviceUserBlocks && serviceUserBlocks.length > 0){
          let observables = serviceUserBlocks.map(serviceUserBlock => {
            let getForum$ = that.userForumService.getForum(serviceUserBlock.forumUid, serviceUserBlock.forumId).pipe(
              switchMap(forum => {
                if (forum) {
                  let getUser$ = that.userService.getUser(serviceUserBlock.userId);
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

                  return combineLatest([getDefaultForumImage$, getUser$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, user] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          tinyDownloadUrl: '../../../../assets/defaultTiny.jpg'
                        };
                        forum.defaultForumImage = of(tempImage);
                      }

                      if (user)
                        forum.user = of(user);
                      else
                        forum.user = of(null);

                      return of(forum);
                    })
                  );
                }
                else return of(null);
              })
            );

            return combineLatest([getForum$]).pipe(
              switchMap(results => {
                const [forum] = results;

                if (forum)
                  serviceUserBlock.forum = of(forum);
                else {
                  serviceUserBlock.forum = of(null);
                }
                return of(serviceUserBlock);
              })
            );
          });
          return zip(...observables);
        }
        else return of([]);
      })
    )
    .subscribe(serviceUserBlocks => {
      this.serviceUserBlocksArray = _.slice(serviceUserBlocks, 0, this.numberItems);
      this.serviceUserBlocks = of(this.serviceUserBlocksArray);
      this.nextKey = _.get(serviceUserBlocks[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (serviceUserBlock) {
    this.userServiceUserBlockService.delete(serviceUserBlock.forumUid, serviceUserBlock.forumId, serviceUserBlock.userId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.serviceUserBlocksArray)['creationDate']);
    this.getServiceUserBlockList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getServiceUserBlockList(prevKey);
  }
}
