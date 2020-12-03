import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import {
  UserPaymentService,
  UserServiceService,
  UserServiceImageService,
  Payment,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

// import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
// import { Location } from '@angular/common';
// import { AngularFireDatabase } from '@angular/fire/database';
// import { ActivatedRoute, Params } from '@angular/router';
// import { AuthService } from '../../../core/auth.service';
// import { Router } from '@angular/router';
// import { FormGroup, FormControl, FormBuilder} from '@angular/forms';
// import {
//   UserPaymentService,
//   UserServiceService,
//   UserServiceImageService,
//   Payment,
//   NoTitlePipe,
//   TruncatePipe
// } from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';
import { StripeService, StripeCardComponent } from 'ngx-stripe';
import {
  StripeCardElementOptions,
  StripeElementsOptions,
  PaymentIntent,
} from '@stripe/stripe-js';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-payment-new',
  templateUrl: './user.payment.new.component.html',
  styleUrls: ['./user.payment.new.component.css']
})
export class UserPaymentNewComponent implements OnInit, OnDestroy {
  @ViewChild(StripeCardComponent) card: StripeCardComponent;
  private _loading = new BehaviorSubject(false);
  private _sellerServiceSubscription: Subscription;
  private _buyerServiceSubscription: Subscription;
  private _paymentSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _sellerUid: string;
  private _sellerServiceId: string;
  
  public sellerService: Observable<any>;
  public payment: Observable<any>;
  public serviceGroup: FormGroup;
  public loading: Observable<boolean> = this._loading.asObservable();
  public userServices: Observable<any[]>;
  public userServicesCtrl: FormControl;
  public defaultServiceImage: Observable<any>;
  public numberItems: number = 100;
  public showPaymentButton: boolean = true;
  public cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0',
        },
      },
    },
  };
  public elementsOptions: StripeElementsOptions = {
    locale: 'en',
  };

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userPaymentService: UserPaymentService,
    private stripeService: StripeService,
    private router: Router,
    private snackbar: MatSnackBar) {
      this.userServicesCtrl = new FormControl();
  }

  trackUserServices (index, service) { return service.serviceId; }

  ngOnDestroy () {
    if (this._sellerServiceSubscription)
      this._sellerServiceSubscription.unsubscribe();

    if (this._buyerServiceSubscription)
      this._buyerServiceSubscription.unsubscribe();

    if (this._paymentSubscription)
      this._paymentSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();
  }

  showImageList(){
    // console.log('service ' + this.serviceGroup.get('serviceId').value);

    if (this.serviceGroup.get('type').value == 'Private')
      this.router.navigate(['/user/service/image/list'], { queryParams: { userId: this.serviceGroup.get('uid').value, serviceId: this.serviceGroup.get('serviceId').value } });
    else
      this.router.navigate(['/service/image/list'], { queryParams: { serviceId: this.serviceGroup.get('serviceId').value } });
  }

  selectService(){
    if (this.userServicesCtrl.value && this.userServicesCtrl.value.title.length > 0){
      this.sellerService.subscribe(sellerService => {
        if (sellerService.serviceId != this.userServicesCtrl.value.serviceId)
          this.showPaymentButton = false;
        else
          this.showPaymentButton = true;
      });
    }
  }

  pay(){
    this.sellerService.subscribe(sellerService => {
      const newPayment: Payment = {
        paymentId: '',
        receiptId: '',
        amount: sellerService.amount,
        description: sellerService.description,
        status: '',
        buyerUid: this.userServicesCtrl.value.uid,
        buyerServiceId: this.userServicesCtrl.value.serviceId,
        sellerUid: sellerService.uid,
        sellerServiceId: sellerService.serviceId,
        paymentIntent: null,
        creationDate: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
      };

      this._paymentSubscription = this.userPaymentService.create(this.userServicesCtrl.value.uid, newPayment).subscribe(payment => {
        if (payment){
          this.stripeService.confirmCardPayment(payment.paymentIntent.client_secret, {
            payment_method: {
              card: this.card.element,
              billing_details: {
                name: sellerService.title
              },
            },
          })
          .subscribe((result) => {
            if (result.error) {
              // Show error to your customer (e.g., insufficient funds)
              console.log(result.error.message);
            } else {
              // The payment has been processed!
              if (result.paymentIntent.status === 'succeeded') {
                // Show a success message to your customer
              }
            }
          });
        }
      });
    });
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._sellerUid = params['userId']
      this._sellerServiceId = params['serviceId']

      this.userServiceService.getServiceFromPromise(this._sellerUid, this._sellerServiceId)
        .then(service => {
          if (service){
            if (service.paymentType == 'Payment'){
              this.sellerService = this.userServiceService.getService(this._sellerUid, this._sellerServiceId);
              this.initForm();
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `Status of service was changed to free`,
                  panelClass: ['red-snackbar']
                }
              );

              if (service.type == 'Public')
                this.router.navigate(['/']);
              else
                this.router.navigate(['/']);
            }
          }
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'Service does not exist or was recently removed',
                panelClass: ['red-snackbar']
              }
            );
            this.router.navigate(['/']);
          }
        }
      )
      .catch(error => {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: error.message,
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/']);
      });
    });
  }

  private initForm () {
    const that = this;

    this.serviceGroup = this.fb.group({
      serviceId:                          [''],
      uid:                                [''],
      type:                               [''],
      title:                              [''],
      name:                               [''],
      title_lowercase:                    [''],
      description:                        [''],
      website:                            [''],
      default:                            [''],
      indexed:                            [''],
      rate:                               [''],
      paymentType:                        [''],
      amount:                             [''],
      currency:                           [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });

    //  ongoing subscription
    this._serviceSubscription = this.sellerService
      .subscribe(service => {
        if (service){
          this.serviceGroup.setValue({ 
            serviceId: service.serviceId,
            uid: service.uid,
            type: service.type,
            title: service.title,
            name: service.title,
            title_lowercase: service.title_lowercase,
            description: service.description,
            website: service.website,
            default: service.default,
            indexed: service.indexed,
            rate: service.rate,
            paymentType: service.paymentType,
            amount: service.amount,
            currency: service.currency,
            includeDescriptionInDetailPage: service.includeDescriptionInDetailPage,
            includeImagesInDetailPage: service.includeImagesInDetailPage,
            includeTagsInDetailPage: service.includeTagsInDetailPage,
            lastUpdateDate: service.lastUpdateDate,
            creationDate: service.creationDate
          });
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Service does not exist or was recently removed',
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      }
    );

    // run once subscription
    const runOnceSubscription = this.sellerService.subscribe(service => {
      if (service){
        let load = async function(){
          try {
            // get seller service image
            that._defaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
                that.defaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultThumbnail.jpg'
                };
                that.defaultServiceImage = of(tempImage);
              }
            });

            // get end user services
            that.userServices = that.userServiceService.getServices(that.auth.uid, that.numberItems, '', [], true, true);
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