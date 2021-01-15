import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  UserServiceImageService,
  UserServiceTagService,
  UserPaymentService,
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
            let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(payment.sellerUid, payment.sellerServiceId).pipe(
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
            let getServiceTags$ = this.userServiceTagService.getTags(payment.sellerUid, payment.sellerServiceId);
  
            return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
              switchMap(results => {
                const [defaultServiceImage, serviceTags] = results;

                if (defaultServiceImage)
                  payment.defaultServiceImage = of(defaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultThumbnail.jpg'
                  };
                  payment.defaultServiceImage = of(tempImage);
                }

                if (serviceTags)
                  payment.serviceTags = of(serviceTags);
                else {
                  payment.serviceTags = of([]);
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