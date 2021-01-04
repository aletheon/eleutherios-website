import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  private _defaultServiceImageSubscription: Subscription;
  private _serviceTagSubscription: Subscription;
  
  public paymentGroup: FormGroup;
  public payment: Observable<any>;
  public defaultServiceImage: Observable<any>;
  public serviceTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userPaymentService: UserPaymentService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar,
    private changeDetector : ChangeDetectorRef) {
  }

  ngOnDestroy () {
    if (this._initialPaymentSubscription)
      this._initialPaymentSubscription.unsubscribe();

    if (this._paymentSubscription)
      this._paymentSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._serviceTagSubscription)
      this._serviceTagSubscription.unsubscribe();
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
      type:                             [''],
      title:                            [''],
      description:                      [''],
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
            that._defaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(payment.sellerUid, payment.sellerServiceId).pipe(
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
              that.defaultServiceImage = of(serviceImage);
            });

            that._serviceTagSubscription = that.userServiceTagService.getTags(payment.sellerUid, payment.sellerServiceId).subscribe(serviceTags => {
              if (serviceTags && serviceTags.length > 0)
                that.serviceTags = of(serviceTags);
              else
                that.serviceTags = of([]);
            });
          }
          catch (error) {
            console.log('here');
            throw error;
          }
        }
    
        // call load
        load().then(() => {
          this._loading.next(false);
          this.changeDetector.detectChanges();
          runOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }
}