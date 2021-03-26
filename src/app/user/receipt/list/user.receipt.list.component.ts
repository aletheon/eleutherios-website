import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserReceiptService,
  UserServiceImageService,
  UserServiceTagService,
  UserServiceService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
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
  private _userSubscription: Subscription;
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
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userReceiptService: UserReceiptService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userServiceService: UserServiceService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._subscription)
      this._subscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();

    if (this._siteTotalSubscription)
      this._siteTotalSubscription.unsubscribe();
  }

  trackReceipts (index, receipt) { return receipt.receiptId; }

  ngOnInit () {
    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        // get params
        this.route.queryParams.subscribe((params: Params) => {
          // reset keys if the route changes either public/private
          this.nextKey = null;
          this.prevKeys = [];
          this._siteTotalSubscription = this.siteTotalService.getTotal(this.loggedInUserId)
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
    });
  }

  getReceiptsList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();

    // loading
    this._loading.next(true);

    this._subscription = this.userReceiptService.getReceipts(this.loggedInUserId, this.numberItems, key).pipe(
      switchMap(receipts => {
        if (receipts && receipts.length > 0){
          let observables = receipts.map(receipt => {
            let getBuyerService$ = this.userServiceService.getService(receipt.buyerUid, receipt.buyerServiceId);
            let getSellerService$ = this.userServiceService.getService(receipt.sellerUid, receipt.sellerServiceId);
            let getBuyerDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(receipt.buyerUid, receipt.buyerServiceId).pipe(
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
            let getSellerDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(receipt.sellerUid, receipt.sellerServiceId).pipe(
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
                        serviceImages[0].url = '../../../assets/defaultiny.jpg';

                      return of(serviceImages[0]);
                    })
                  );
                }
                else return of(null);
              })
            );
            let getBuyerServiceTags$ = this.userServiceTagService.getTags(receipt.buyerUid, receipt.buyerServiceId);

            return combineLatest([getBuyerService$, getSellerService$, getBuyerDefaultServiceImage$, getSellerDefaultServiceImage$, getBuyerServiceTags$]).pipe(
              switchMap(results => {
                const [buyerService, sellerService, buyerDefaultServiceImage, sellerDefaultServiceImage, buyerServiceTags] = results;

                if (sellerDefaultServiceImage)
                  receipt.sellerDefaultServiceImage = of(sellerDefaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultTiny.jpg'
                  };
                  receipt.sellerDefaultServiceImage = of(tempImage);
                }

                if (buyerDefaultServiceImage)
                  receipt.buyerDefaultServiceImage = of(buyerDefaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultThumbnail.jpg'
                  };
                  receipt.buyerDefaultServiceImage = of(tempImage);
                }

                if (buyerServiceTags)
                  receipt.buyerServiceTags = of(buyerServiceTags);
                else {
                  receipt.buyerServiceTags = of([]);
                }

                if (buyerService){
                  receipt.buyerType = buyerService.type;
                  receipt.buyerPaymentType = buyerService.paymentType;
                  receipt.buyerTitle = buyerService.title;
                  receipt.buyerDescription = buyerService.description;
                }

                if (sellerService){
                  receipt.sellerType = sellerService.type;
                  receipt.sellerPaymentType = sellerService.paymentType;
                  receipt.sellerTitle = sellerService.title;
                  receipt.sellerDescription = sellerService.description;
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
