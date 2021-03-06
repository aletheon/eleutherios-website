import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserServiceService,
  UserForumService,
  UserServiceImageService,
  UserForumImageService,
  UserServiceBlockService,
  UserForumRegistrantService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-service-block-list',
  templateUrl: './user.forum.service.block.list.component.html',
  styleUrls: ['./user.forum.service.block.list.component.css']
})
export class UserForumServiceBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _userSubscription: Subscription;
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public forumServiceBlocks: Observable<any[]> = of([]);
  public forumServiceBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userForumImageService: UserForumImageService,
    private userServiceBlockService: UserServiceBlockService,
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

  trackForumServiceBlocks (index, serviceBlock) { return serviceBlock.serviceBlockId; }

  ngOnInit () {
    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        // get params
        this.route.queryParams.subscribe((params: Params) => {
          this.nextKey = null;
          this.prevKeys = [];

          this._totalSubscription = this.siteTotalService.getTotal(this.loggedInUserId)
            .subscribe(total => {
              if (total){
                if (total.serviceBlockCount == 0)
                  this._total.next(-1);
                else
                  this._total.next(total.serviceBlockCount);
              }
              else this._total.next(-1);
            }
          );
          this.getForumServiceBlockList();
        });
      }
    });
  }

  getForumServiceBlockList (key?: any) {
    const that = this;

    this._loading.next(true);

    this._subscription = this.userServiceBlockService.getUserServiceBlocks(this.loggedInUserId, this.numberItems, key).pipe(
      switchMap(serviceBlocks => {
        if (serviceBlocks && serviceBlocks.length > 0){
          let observables = serviceBlocks.map(serviceBlock => {
            let getForum$ = this.userForumService.getForum(serviceBlock.forumUid, serviceBlock.forumId).pipe(
              switchMap(forum => {
                if (forum) {
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

                  let getService$ = this.userServiceService.getService(serviceBlock.serviceUid, serviceBlock.serviceId).pipe(
                    switchMap(service => {
                      if (service){
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

                        return combineLatest([getDefaultServiceImage$]).pipe(
                          switchMap(results => {
                            const [defaultServiceImage] = results;

                            if (defaultServiceImage)
                              service.defaultServiceImage = of(defaultServiceImage);
                            else {
                              let tempImage = {
                                tinyDownloadUrl: '../../../../assets/defaultTiny.jpg'
                              };
                              service.defaultServiceImage = of(tempImage);
                            }
                            return of(service);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.loggedInUserId).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getService$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, service, defaultRegistrant] = results;

                      if (defaultForumImage)
                        service.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          tinyDownloadUrl: '../../../../assets/defaultTiny.jpg'
                        };
                        service.defaultForumImage = of(tempImage);
                      }

                      if (service)
                        forum.service = of(service);
                      else
                        forum.service = of(null);

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

            return combineLatest([getForum$]).pipe(
              switchMap(results => {
                const [forum] = results;

                if (forum)
                  serviceBlock.forum = of(forum);
                else {
                  serviceBlock.forum = of(null);
                }
                return of(serviceBlock);
              })
            );
          });
          return zip(...observables);
        }
        else return of([]);
      })
    )
    .subscribe(serviceBlocks => {
      this.forumServiceBlocksArray = _.slice(serviceBlocks, 0, this.numberItems);
      this.forumServiceBlocks = of(this.forumServiceBlocksArray);
      this.nextKey = _.get(serviceBlocks[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (serviceBlock) {
    this.userServiceBlockService.delete(serviceBlock.forumUid, serviceBlock.forumId, serviceBlock.serviceId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.forumServiceBlocksArray)['creationDate']);
    this.getForumServiceBlockList(this.nextKey);
  }

  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getForumServiceBlockList(prevKey);
  }
}
