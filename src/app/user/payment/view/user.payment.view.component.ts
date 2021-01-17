import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserPaymentService,
  UserServiceImageService,
  UserServiceTagService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";


@Component({
  selector: 'user-payment-view',
  templateUrl: './user.payment.view.component.html',
  styleUrls: ['./user.payment.view.component.css']
})
export class UserPaymentViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialPaymentSubscription: Subscription;
  private _paymentSubscription: Subscription;
  private _buyerDefaultServiceImageSubscription: Subscription;
  private _sellerDefaultServiceImageSubscription: Subscription;
  private _sellerServiceTagSubscription: Subscription;
  
  public paymentGroup: FormGroup;
  public payment: Observable<any>;
  public buyerDefaultServiceImage: Observable<any>;
  public sellerDefaultServiceImage: Observable<any>;
  public sellerServiceTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userPaymentService: UserPaymentService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._initialPaymentSubscription)
      this._initialPaymentSubscription.unsubscribe();

    if (this._paymentSubscription)
      this._paymentSubscription.unsubscribe();

    if (this._buyerDefaultServiceImageSubscription)
      this._buyerDefaultServiceImageSubscription.unsubscribe();

    if (this._sellerDefaultServiceImageSubscription)
      this._sellerDefaultServiceImageSubscription.unsubscribe();

    if (this._sellerServiceTagSubscription)
      this._sellerServiceTagSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._initialPaymentSubscription = this.userPaymentService.getPayment(this.auth.uid, params['paymentId']).subscribe(payment => {
        this._initialPaymentSubscription.unsubscribe();

        if (payment){
          this.payment = this.userPaymentService.getPayment(this.auth.uid, params['paymentId']);
          this.initForm();
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Payment does not exist or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      });
    });
  }

  private initForm () {
    const that = this;
    
    this.paymentGroup = this.fb.group({
      paymentId:                        [''],
      uid:                              [''],
      receiptId:                        [''],
      amount:                           [''],
      currency:                         [''],
      buyerType:                        [''],
      buyerPaymentType:                 [''],
      buyerTitle:                       [''],
      buyerDescription:                 [''],
      sellerType:                       [''],
      sellerPaymentType:                [''],
      sellerTitle:                      [''],
      sellerDescription:                [''],
      quantity:                         [''],
      status:                           [''],
      buyerUid:                         [''],
      buyerServiceId:                   [''],
      sellerUid:                        [''],
      sellerServiceId:                  [''],
      paymentIntentId:                  [''],
      lastUpdateDate:                   [''],
      creationDate:                     ['']
    });

    //  ongoing subscription
    this._paymentSubscription = this.payment.subscribe(payment => {
      if (payment){
        this.paymentGroup.patchValue(payment);
      }
      this._loading.next(false);
    });

    // run once subscription
    const runOnceSubscription = this.payment.subscribe(payment => {
      if (payment){
        let load = async function(){
          try {
            that._sellerDefaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(payment.sellerUid, payment.sellerServiceId).pipe(
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
            )
            .subscribe(serviceImage => {
              if (serviceImage)
                that.sellerDefaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultThumbnail.jpg'
                };
                that.sellerDefaultServiceImage = of(tempImage);
              }
            });

            that._buyerDefaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(payment.buyerUid, payment.buyerServiceId).pipe(
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
            )
            .subscribe(serviceImage => {
              if (serviceImage)
                that.buyerDefaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultTiny.jpg'
                };
                that.buyerDefaultServiceImage = of(tempImage);
              }
            });

            that._sellerServiceTagSubscription = that.userServiceTagService.getTags(payment.sellerUid, payment.sellerServiceId).subscribe(serviceTags => {
              if (serviceTags && serviceTags.length > 0)
                that.sellerServiceTags = of(serviceTags);
              else
                that.sellerServiceTags = of([]);
            });
          }
          catch (error) {
            throw error;
          }
        }
    
        // call load
        load().then(() => {
          this._loading.next(false);
          runOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }
}