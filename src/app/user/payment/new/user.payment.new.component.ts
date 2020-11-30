// https://stackoverflow.com/questions/56041334/stripe-paymentintent-card-how-to-implement

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import {
  UserPaymentService,
  UserServiceService,
  UserServiceImageService,
  Payment
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-payment-new',
  templateUrl: './user.payment.new.component.html',
  styleUrls: ['./user.payment.new.component.css']
})
export class UserPaymentNewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _sellerServiceSubscription: Subscription;
  private _buyerServiceSubscription: Subscription;
  private _paymentSubscription: Subscription;
  private _sellerUid: string;
  private _sellerServiceId: string;
  
  public sellerService: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userPaymentService: UserPaymentService,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._sellerServiceSubscription)
      this._sellerServiceSubscription.unsubscribe();

    if (this._buyerServiceSubscription)
      this._buyerServiceSubscription.unsubscribe();

    if (this._paymentSubscription)
      this._paymentSubscription.unsubscribe();
  }

  private createPayment (buyerService, sellerService){
    const newPayment: Payment = {
      paymentId: '',
      receiptId: '',
      amount: sellerService.amount,
      description: sellerService.description,
      status: '',
      buyerUid: buyerService.uid,
      buyerServiceId: buyerService.serviceId,
      sellerUid: sellerService.uid,
      sellerServiceId: sellerService.serviceId,
      paymentIntent: null,
      creationDate: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
    };

    this._paymentSubscription = this.userPaymentService.create(this.auth.uid, newPayment).subscribe(payment => {
      if (payment){

      }
    });
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._sellerUid = params['uid']
      this._sellerServiceId = params['serviceId']

      this.sellerService = this.userServiceService.getService(this._sellerUid, this._sellerServiceId).pipe(
        switchMap(service => {
          if (service){
            let getDefaultServiceImage$ = this.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
            
            return combineLatest([getDefaultServiceImage$]).pipe(
              switchMap(results => {
                const [defaultServiceImage] = results;

                if (defaultServiceImage)
                  service.defaultServiceImage = of(defaultServiceImage);
                else {
                  let tempImage = {
                    url: '../../../assets/defaultThumbnail.jpg'
                  };
                  service.defaultServiceImage = of(tempImage);
                }
                return of(service);
              })
            );
          }
          else return of(null);
        })
      )
    });

    // const newPayment: Payment = {
    //   paymentId: '',
    //   receiptId: '',
    //   amount: 0,
    //   description: '',
    //   status: '',
    //   buyerUid: '',
    //   buyerServiceId: '',
    //   sellerUid: '',
    //   sellerServiceId: '',
    //   paymentIntent: null,
    //   creationDate: firebase.firestore.FieldValue.serverTimestamp(),
    //   lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
    // };

    // this.userPaymentService.create(this.auth.uid, newPayment).then(() => {
    //   // do something
    // })
    // .catch(error => {
    //   const snackBarRef = this.snackbar.openFromComponent(
    //     NotificationSnackBar,
    //     {
    //       duration: 8000,
    //       data: error.message,
    //       panelClass: ['red-snackbar']
    //     }
    //   );
    // });
  }
}