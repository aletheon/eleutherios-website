import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
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

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-service-forum-block-list',
  templateUrl: './user.service.forum.block.list.component.html',
  styleUrls: ['./user.service.forum.block.list.component.css']
})
export class UserServiceForumBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public serviceForumBlocks: Observable<any[]> = of([]);
  public serviceForumBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumBlockService: UserForumBlockService,
    private userForumRegistrantService: UserForumRegistrantService,
    private route: ActivatedRoute) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceForumBlocks (index, forumBlock) { return forumBlock.forumBlockId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys
      
      this.nextKey = null;
      this.prevKeys = [];

      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
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

  getServiceForumBlockList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    this._loading.next(true);

    this._subscription = this.userForumBlockService.getUserForumBlocks(this.auth.uid, this.numberItems, key).pipe(
      switchMap(forumBlocks => {
        if (forumBlocks && forumBlocks.length > 0){
          let observables = forumBlocks.map(forumBlock => {
            return that.userServiceService.getService(forumBlock.serviceUid, forumBlock.serviceId).pipe(
              switchMap(service => {
                if (service){
                  let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
                  let getForum$ = this.userForumService.getForum(forumBlock.forumUid, forumBlock.forumId).pipe(
                    switchMap(forum => {
                      if (forum){
                        let getDefaultForumImages$ = this.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId);
                        let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.auth.uid).pipe(
                          switchMap(registrants => {
                            if (registrants && registrants.length > 0)
                              return of(registrants[0]);
                            else
                              return of(null);
                          })
                        );
      
                        return combineLatest([getDefaultForumImages$, getDefaultRegistrant$]).pipe(
                          switchMap(results => {
                            const [defaultForumImages, defaultRegistrant] = results;
                                            
                            if (defaultForumImages && defaultForumImages.length > 0)
                              forum.defaultForumImage = of(defaultForumImages[0]);
                            else {
                              let tempImage = {
                                tinyUrl: '../../../assets/defaultTiny.jpg',
                                name: 'No image'
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

                  return combineLatest([getDefaultServiceImages$, getForum$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImages, forum] = results;

                      if (defaultServiceImages)
                        service.defaultServiceImage = of(defaultServiceImages[0]);
                      else {
                        let tempImage = {
                          tinyUrl: '../../../assets/defaultTiny.jpg',
                          name: 'No image'
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
          });

          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              if (result)
                forumBlocks[i].service = of(result);
              else
                forumBlocks[i].service = of(null);
              
              return forumBlocks[i];
            });
          });
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