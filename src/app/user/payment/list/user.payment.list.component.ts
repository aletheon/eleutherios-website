import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserServiceImageService,
  UserServiceTagService,
  UserPaymentService,
  UserServiceService,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-payment-list',
  templateUrl: './user.payment.list.component.html',
  styleUrls: ['./user.payment.list.component.css']
})
export class UserPaymentListComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _total = new BehaviorSubject(0);
  private _subscription: Subscription;
  private _totalSubscription: Subscription;
  private _siteTotalSubscription: Subscription;

  public numberItems: number = 12;
  public nextKey: any;
  public prevKeys: any[] = [];
  public loading: Observable<boolean> = this._loading.asObservable();
  public payments: Observable<any[]> = of([]);
  public paymentsArray: any[] = [];
  public total: Observable<number> = this._total.asObservable();
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userPaymentService: UserPaymentService,
    private userServiceService: UserServiceService,
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

  trackPayments (index, payment) { return payment.paymentId; }

  ngOnInit () {
    // stick this in to fix authguard issue of reposting back to this page???
    if (this.auth.uid.length == 0)
      return false;
      
    // get params
    this.route.queryParams.subscribe((params: Params) => {
      // reset keys if the route changes either public/private
      this.nextKey = null;
      this.prevKeys = [];
      this._siteTotalSubscription = this.siteTotalService.getTotal(this.auth.uid)
        .subscribe(total => {
          if (total){
            if (total.paymentCount == 0)
              this._total.next(-1);
            else
              this._total.next(total.paymentCount);
          }
        }
      );
      this.getPaymentsList();
    });
  }

  getPaymentsList (key?: any) {
    if (this._subscription)
      this._subscription.unsubscribe();
    
    // loading
    this._loading.next(true);

    this._subscription = this.userPaymentService.getPayments(this.auth.uid, this.numberItems, key).pipe(
      switchMap(payments => {
        if (payments && payments.length > 0){
          let observables = payments.map(payment => {
            let getSellerService$ = this.userServiceService.getService(payment.sellerUid, payment.sellerServiceId);
            let getBuyerService$ = this.userServiceService.getService(payment.buyerUid, payment.buyerServiceId);
            let getSellerDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(payment.sellerUid, payment.sellerServiceId).pipe(
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
            let getBuyerDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(payment.buyerUid, payment.buyerServiceId).pipe(
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
            let getSellerServiceTags$ = this.userServiceTagService.getTags(payment.sellerUid, payment.sellerServiceId);
  
            return combineLatest([getSellerService$, getBuyerService$, getSellerDefaultServiceImage$, getBuyerDefaultServiceImage$, getSellerServiceTags$]).pipe(
              switchMap(results => {
                const [sellerService, buyerService, sellerDefaultServiceImage, buyerDefaultServiceImage, sellerServiceTags] = results;

                if (sellerDefaultServiceImage)
                  payment.sellerDefaultServiceImage = of(sellerDefaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultThumbnail.jpg'
                  };
                  payment.sellerDefaultServiceImage = of(tempImage);
                }

                if (buyerDefaultServiceImage)
                  payment.buyerDefaultServiceImage = of(buyerDefaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultTiny.jpg'
                  };
                  payment.buyerDefaultServiceImage = of(tempImage);
                }

                if (sellerServiceTags)
                  payment.sellerServiceTags = of(sellerServiceTags);
                else {
                  payment.sellerServiceTags = of([]);
                }

                if (sellerService){
                  payment.sellerType = sellerService.type;
                  payment.sellerPaymentType = sellerService.paymentType;
                  payment.sellerTitle = sellerService.title;
                  payment.sellerDescription = sellerService.description;
                }

                if (buyerService){
                  payment.buyerType = buyerService.type;
                  payment.buyerPaymentType = buyerService.paymentType;
                  payment.buyerTitle = buyerService.title;
                  payment.buyerDescription = buyerService.description;
                }
                return of(payment);
              })
            );
          });
    
          return zip(...observables, (...results) => {
            return results.map((result, i) => {
              return payments[i];
            });
          });
        }
        else return of([]);
      })
    )
    .subscribe(payments => {
      this.paymentsArray = _.slice(payments, 0, this.numberItems);
      this.payments = of(this.paymentsArray);
      this.nextKey = _.get(payments[this.numberItems], 'creationDate');
      this._loading.next(false);
    });
  }

  delete (payment) {
    this.userPaymentService.delete(payment.uid, payment.paymentId);
  }

  onNext () {
    this.prevKeys.push(_.first(this.paymentsArray)['creationDate']);
    this.getPaymentsList(this.nextKey);
  }
  
  onPrev () {
    const prevKey = _.last(this.prevKeys); // get last key
    this.prevKeys = _.dropRight(this.prevKeys); // delete last key
    this.getPaymentsList(prevKey);
  }
}