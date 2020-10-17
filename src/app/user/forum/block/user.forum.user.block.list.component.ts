import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import {
  SiteTotalService,
  UserServiceService,
  UserServiceImageService,
  UserForumUserBlockService,
  UserService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-user-block-list',
  templateUrl: './user.forum.user.block.list.component.html',
  styleUrls: ['./user.forum.user.block.list.component.css']
})
export class UserForumUserBlockListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public forumUserBlocks: Observable<any[]> = of([]);
  public forumUserBlocksArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userService: UserService,
    private route: ActivatedRoute) {
  }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackForumUserBlocks (index, userBlock) { return userBlock.forumUserBlockId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys
      this.nextKey = null;
      this.prevKeys = [];

      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.forumUserBlockCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.forumUserBlockCount);
          }
          else this._total.next(-1);          
        }
      );
      this.getForumUserBlockList();
    });
  }

  getForumUserBlockList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userForumUserBlockService.getForumUserBlocks(this.auth.uid, this.numberItems, key).pipe(
      switchMap(forumUserBlocks => {
        if (forumUserBlocks && forumUserBlocks.length > 0){
          let observables = forumUserBlocks.map(forumUserBlock => {
            return that.userServiceService.getService(forumUserBlock.serviceUid, forumUserBlock.serviceId).pipe(
              switchMap(service => {
                if (service){
                  let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
                  let getUser$ = that.userService.getUser(forumUserBlock.userId);

                  return combineLatest([getDefaultServiceImage$, getUser$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, user] = results;

                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          url: '../../../assets/defaultTiny.jpg'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }
                      
                      if (user)
                        service.user = of(user);
                      else
                        service.user = of(null);

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
                forumUserBlocks[i].service = of(result);
              else 
                forumUserBlocks[i].service = of(null);
              
              return forumUserBlocks[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(forumUserBlocks => {
      this.forumUserBlocksArray = _.slice(forumUserBlocks, 0, this.numberItems);
      this.forumUserBlocks = of(this.forumUserBlocksArray);
      this.nextKey = _.get(forumUserBlocks[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (forumUserBlock) {
    this.userForumUserBlockService.delete(forumUserBlock.serviceUid, forumUserBlock.serviceId, forumUserBlock.userId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.forumUserBlocksArray)['creationDate']);
    this.getForumUserBlockList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getForumUserBlockList(prevKey);
  }
}