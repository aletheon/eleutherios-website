import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
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

import { Observable, Subscription, BehaviorSubject, of, combineLatest } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-service-block-list',
  templateUrl: './user.forum.service.block.list.component.html',
  styleUrls: ['./user.forum.service.block.list.component.css']
})
export class UserForumServiceBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public forumServiceBlocks: Observable<any[]> = of([]);
  public forumServiceBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userForumImageService: UserForumImageService,
    private userServiceBlockService: UserServiceBlockService,
    private userForumRegistrantService: UserForumRegistrantService,
    private route: ActivatedRoute) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackForumServiceBlocks (index, serviceBlock) { return serviceBlock.serviceBlockId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      this.nextKey = null;
      this.prevKeys = [];

      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
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

  getForumServiceBlockList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    this._loading.next(true);

    this._subscription = this.userServiceBlockService.getUserServiceBlocks(this.auth.uid, this.numberItems, key).pipe(
      switchMap(serviceBlocks => {
        if (serviceBlocks && serviceBlocks.length > 0){
          let observables = serviceBlocks.map(serviceBlock => {
            return that.userForumService.getForum(serviceBlock.forumUid, serviceBlock.forumId).pipe(
              switchMap(forum => {
                if (forum){
                  let getDefaultForumImages$ = this.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId);
                  let getService$ = this.userServiceService.getService(serviceBlock.serviceUid, serviceBlock.serviceId).pipe(
                    switchMap(service => {
                      if (service){
                        let getDefaultServiceImages$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId);
      
                        return combineLatest(getDefaultServiceImages$).pipe(
                          switchMap(results => {
                            const [defaultServiceImages] = results;
                                            
                            if (defaultServiceImages && defaultServiceImages.length > 0)
                              service.defaultServiceImage = of(defaultServiceImages[0]);
                            else {
                              let tempImage = {
                                tinyUrl: '../../../assets/defaultTiny.jpg',
                                name: 'No image'
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
                  let getDefaultRegistrant$ = this.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, this.auth.uid).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest(getDefaultForumImages$, getService$, getDefaultRegistrant$).pipe(
                    switchMap(results => {
                      const [defaultForumImages, service, defaultRegistrant] = results;

                      if (defaultForumImages && defaultForumImages.length > 0)
                        service.defaultForumImage = of(defaultForumImages[0]);
                      else {
                        let tempImage = {
                          tinyUrl: '../../../assets/defaultTiny.jpg',
                          name: 'No image'
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
          });

          return combineLatest(...observables, (...results) => {
            return results.map((result, i) => {
              if (result)
                serviceBlocks[i].forum = of(result);
              else
                serviceBlocks[i].forum = of(null);
              
              return serviceBlocks[i];
            });
          });
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