import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserServiceService,
  UserReceiptService,
  UserServiceImageService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-receipt-list',
  templateUrl: './user.receipt.list.component.html',
  styleUrls: ['./user.receipt.list.component.css']
})
export class UserReceiptListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _siteTotalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public receipts: Observable<any[]> = of([]);
  public receiptsArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceService: UserServiceService,
    private userReceiptService: UserReceiptService,
    private userServiceImageService: UserServiceImageService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  ngOnDestroy () {
    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._siteTotalSubscription)
      this._siteTotalSubscription.unsubscribe();
  }

  trackReceipts (index, receipt) { return receipt.receiptId; }

  ngOnInit () {
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];
      this._siteTotalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.receiptCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.receiptCount);
          }
        }
      );
      this.getReceiptsList();
    });
  }

  getReceiptsList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();
    
    // loading
    this._loading.next(true);

    this._subscription = this.userReceiptService.getReceipts(this.auth.uid, this.numberItems, key).pipe(
      switchMap(receipts => {
        if (receipts && receipts.length > 0){
          let observables = receipts.map(receipt => {
            let getService$ = this.userServiceService.getService(receipt.buyerUid, receipt.buyerServiceId);
            let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(receipt.buyerUid, receipt.buyerServiceId).pipe(
              switchMap(serviceImages => {
                if (serviceImages && serviceImages.length > 0){
                  let getDownloadUrl$: Observable<any>;

                  if (serviceImages[0].smallUrl)
                    getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].smallUrl).getDownloadURL());

                  return combineLatest([getDownloadUrl$]).pipe(
                    switchMap(results => {
                      const [downloadUrl] = results;
                      
                      if (downloadUrl)
                        serviceImages[0].url = downloadUrl;
                      else
                        serviceImages[0].url = '../../../assets/defaultThumbnail.jpg';
        
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

                if (service)
                  receipt.service = of(service)
                else
                  receipt.service = of(null);

                if (defaultServiceImage)
                  receipt.defaultServiceImage = of(defaultServiceImage);
                else {
                  let tempImage = {
                    smallUrl: '../../../assets/defaultThumbnail.jpg',
                    name: 'No image'
                  };
                  receipt.defaultServiceImage = of(tempImage);
                }
                return of(receipt);
              })
            );
          });
    
          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              return receipts[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(receipts => {
      this.receiptsArray = _.slice(receipts, 0, this.numberItems);
      this.receipts = of(this.receiptsArray);
      this.nextKey = _.get(receipts[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (receipt) {
    this.userReceiptService.delete(receipt.uid, receipt.receiptId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.receiptsArray)['creationDate']);
    this.getReceiptsList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getReceiptsList(prevKey);
  }
}