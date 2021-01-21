import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserTagService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'user-tag-list',
  templateUrl: './user.tag.list.component.html',
  styleUrls: ['./user.tag.list.component.css']
})
export class UserTagListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public tags: Observable<any[]> = of([]);
  public tagsArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userTagService: UserTagService,
    private route: ActivatedRoute,
    private snackbar: MatSnackBar,
    private router: Router) {
    }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackTags (index, tag) { return tag.tagId; }

  ngOnInit () {
    // stick this in to fix authguard issue of reposting back to this page???
    if (this.auth.uid.length == 0){
      this.router.navigate(['/login']);
      return false;
    }
      
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];

      // get total
      this._totalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.tagCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.tagCount);
          }
        }
      );
      this.getTagList();
    });
  }

  getTagList (key?: any) {
    const that = this;

    if (this._subscription) this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userTagService.getTags(this.auth.uid, this.numberItems, key).pipe(
      switchMap(tags => {
        if (tags && tags.length > 0){
          let observables = tags.map(tag => {
            if (tag){
              let getTagTotal$ = that.siteTotalService.getTotal(tag.tagId);
    
              return combineLatest([getTagTotal$]).pipe(
                switchMap(results => {
                  const [tagTotal] = results;
                  
                  if (tagTotal){
                    tag.forumCount = tagTotal.forumCount;
                    tag.serviceCount = tagTotal.serviceCount;
                    tag.notificationCount = tagTotal.notificationCount;
                  }
                  else {
                    tag.forumCount = 0;
                    tag.serviceCount = 0;
                    tag.notificationCount = 0;
                  }    
                  return of(tag);
                })
              );
            }
            else return of(null);
          });
    
          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              return tags[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(tags => {
      this.tagsArray = _.slice(tags, 0, this.numberItems);
      this.tags = of(this.tagsArray);
      this.nextKey = _.get(tags[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (tag) {
    const tagTotalSubscription = this.siteTotalService.getTotal(tag.tagId)
      .subscribe(total => {
        if (total){
          if (total.forumCount == 0 && total.serviceCount == 0 && total.notificationCount == 0){
            this.userTagService.delete(this.auth.uid, tag.tagId).then(() =>{
              // do something
            })
            .catch(error =>{
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
          else {
            let message = "Unable to delete tag, it is currently used by ";
  
            if (total.forumCount > 0)
              message += `${total.forumCount} forum(s), `;
            
            if (total.serviceCount > 0)
              message += `${total.serviceCount} service(s), `;
  
            if (total.notificationCount > 0)
              message += `${total.notificationCount} notification(s), `;
  
            message = message.substring(0, message.length-2) + '.';
  
            const snackBarRef =this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: message,
                panelClass: ['red-snackbar']
              }
            );
          }
          tagTotalSubscription.unsubscribe();
        }
      }
    );
  }

  onNext () {
    this.prevKeys.push(_.first(this.tagsArray)['creationDate']);
    this.getTagList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getTagList(prevKey);
  }
}