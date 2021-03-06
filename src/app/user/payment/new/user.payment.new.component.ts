import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import {
  UserService,
  UserPaymentService,
  UserServiceService,
  UserServiceImageService,
  UserServiceTagService,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';
import { environment } from '../../../../environments/environment';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';
import { StripeService } from "ngx-stripe";
import {
  StripeElements,
  StripeCardElement,
  StripeCardElementOptions,
  StripeElementsOptions
} from '@stripe/stripe-js';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, from } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-payment-new',
  templateUrl: './user.payment.new.component.html',
  styleUrls: ['./user.payment.new.component.css']
})
export class UserPaymentNewComponent implements OnInit, OnDestroy, AfterViewInit {
  private _loading = new BehaviorSubject(false);
  private _loadCard = new BehaviorSubject(false);
  private _userSubscription: Subscription;
  private _connectedUserSubscription: Subscription;
  private _userServiceSubscription: Subscription;
  private _sellerServiceSubscription: Subscription;
  private _buyerServiceSubscription: Subscription;
  private _paymentSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _sellerUid: string;
  private _sellerServiceId: string;
  private _paymentIntent: any;
  private _user: any;
  private _connectedUser: any;
  private _loadCardListener: Observable<boolean> = this._loadCard.asObservable();

  public sellerService: Observable<any>;
  public payment: Observable<any>;
  public serviceGroup: FormGroup;
  public loading: Observable<boolean> = this._loading.asObservable();
  public userServices: Observable<any[]>;
  public serviceTags: Observable<any[]>;
  public userServicesCtrl: FormControl;
  public defaultServiceImage: Observable<any>;
  public numberItems: number = 100;
  public hidePaymentButton: boolean = true;
  public showSpinner: boolean = false;
  public id: Observable<string>;
  public returnUserId: Observable<string>;
  public returnType: Observable<string> = of('Forum');
  public elements: StripeElements;
  public card: StripeCardElement;
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
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private userService: UserService,
    private userServiceService: UserServiceService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userPaymentService: UserPaymentService,
    private stripeService: StripeService,
    private router: Router,
    private location: Location,
    private snackbar: MatSnackBar) {
      this.userServicesCtrl = new FormControl();
  }

  trackUserServices (index, service) { return service.serviceId; }

  ngAfterViewInit () {
    let intervalId = setInterval(() => {
      if(this._loading.getValue() == false) {
        clearInterval(intervalId);

        // delay the loading of the card element to allow for the seller service to load, and provide us with the connected (merchant) account
        // https://medium.com/@saikiran1298/integrating-stripe-payments-into-angular-and-nodejs-applications-10f40dcc21f5
        this._loadCardListener.subscribe(result => {
          if (result == true){
            this.stripeService.changeKey(environment.stripeTestKey, { stripeAccount: this._connectedUser.stripeAccountId });
            this.stripeService.elements(this.elementsOptions)
              .subscribe(elements => {
                this.elements = elements;

                // Only mount the element the first time
                if (!this.card) {
                  this.card = this.elements.create('card', this.cardOptions);
                  let cardElement = document.getElementById("card-element");

                  if (cardElement){
                    this.card.mount('#card-element');
                    this.card.on('change', function (event) {
                      var displayError = document.getElementById('card-errors');
                      if (event.error) {
                        displayError.textContent = event.error.message;
                      } else {
                        displayError.textContent = '';
                      }
                    });
                  }
                }
              }
            );
          }
        });
      }
    }, 2000);
  }

  ngOnDestroy () {
    // change the key back before leaving
    this.stripeService.changeKey(environment.stripeTestKey);

    if (this._userSubscription)
      this._userSubscription.unsubscribe();

    if (this._connectedUserSubscription)
      this._connectedUserSubscription.unsubscribe();

    if (this._userServiceSubscription)
      this._userServiceSubscription.unsubscribe();

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
    if (this.userServicesCtrl.value && this.userServicesCtrl.value.title.length > 0)
      this.hidePaymentButton = false;
    else
      this.hidePaymentButton = true;
  }

  pay(){
    // const snackBarRef = this.snackbar.openFromComponent(
    //   NotificationSnackBar,
    //   {
    //     duration: 8000,
    //     data: 'The payment gateway system is still being implemented',
    //     panelClass: ['red-snackbar']
    //   }
    // );

    if (this.serviceGroup.get('indexed').value == true && this.serviceGroup.get('paymentId').value.length == 0){
      this.showSpinner = true;
      this.hidePaymentButton = true;

      if (this._paymentIntent){
        console.log('got a payment intent ' + this._paymentIntent.id);

        this.userPaymentService.getPaymentFromPromise(this._paymentIntent.metadata.buyerUserId, this._paymentIntent.metadata.paymentId).then(tempPayment => {
          if (tempPayment){
            console.log('got payment ' + JSON.stringify(tempPayment));
            console.log('title ' + this.serviceGroup.get('title').value);
            console.log('email ' + this._user.email);

            this.stripeService.confirmCardPayment(this._paymentIntent.client_secret, {
              payment_method: {
                card: this.card,
                billing_details: {
                  name: this.serviceGroup.get('title').value,
                  email: this._user.email
                },
              }
            })
            .subscribe((result) => {
              if (result.error) {
                this.showSpinner = false;
                this.hidePaymentButton = false;

                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: result.error.message,
                    panelClass: ['red-snackbar']
                  }
                );
              }
              else {
                // The payment has been processed!
                console.log('result.paymentIntent ' + JSON.stringify(result.paymentIntent));

                // subscribe to the payment
                this._paymentSubscription = this.userPaymentService.getPayment(this._paymentIntent.metadata.buyerUserId, this._paymentIntent.metadata.paymentId).subscribe(payment => {
                  this.payment = of(payment);
                });

                this._paymentIntent = null;
                this.card.clear();
                this.userServicesCtrl.reset();
                this.showSpinner = false;
                this.hidePaymentButton = true;

                if (result.paymentIntent.status === 'succeeded') {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: `Congratulations your payment ${this.serviceGroup.get('currency').value} ${this.serviceGroup.get('amount').value.toFixed(2)} was successful`,
                      panelClass: ['green-snackbar']
                    }
                  );
                }
                else {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: result.paymentIntent.status,
                      panelClass: ['red-snackbar']
                    }
                  );
                }
              }
            });
          }
          else {
            console.log('no payment');
            this.showSpinner = false;
            this.hidePaymentButton = false;
          }
        })
        .catch(error => {
          console.error(error);
          this.showSpinner = false;
          this.hidePaymentButton = false;
        });
      }
      else {
        const createPaymentIntent = firebase.functions().httpsCallable('createPaymentIntent');
        createPaymentIntent({
          sellerUid: this.serviceGroup.get('uid').value,
          sellerServiceId: this.serviceGroup.get('serviceId').value,
          buyerUid: this.userServicesCtrl.value.uid,
          buyerServiceId: this.userServicesCtrl.value.serviceId
        }).then(result => {
          console.log('created paymentIntent result ' + JSON.stringify(result));

          if (result){
            this._paymentIntent = result.data;

            this.userPaymentService.getPaymentFromPromise(this._paymentIntent.metadata.buyerUserId, this._paymentIntent.metadata.paymentId).then(tempPayment => {
              if (tempPayment){
                console.log('got a payment ' + JSON.stringify(tempPayment));

                this.stripeService.confirmCardPayment(this._paymentIntent.client_secret, {
                  payment_method: {
                    card: this.card,
                    billing_details: {
                      name: this.serviceGroup.get('title').value,
                      email: this._user.email
                    },
                  },
                })
                .subscribe((result) => {
                  if (result.error) {
                    this.showSpinner = false;
                    this.hidePaymentButton = false;

                    const snackBarRef = this.snackbar.openFromComponent(
                      NotificationSnackBar,
                      {
                        duration: 8000,
                        data: result.error.message,
                        panelClass: ['red-snackbar']
                      }
                    );
                  }
                  else {
                    // The payment has been processed!
                    console.log('result.paymentIntent ' + JSON.stringify(result.paymentIntent));

                    // subscribe to the payment
                    this._paymentSubscription = this.userPaymentService.getPayment(this._paymentIntent.metadata.buyerUserId, this._paymentIntent.metadata.paymentId).subscribe(payment => {
                      this.payment = of(payment);
                    });

                    this._paymentIntent = null;
                    this.card.clear();
                    this.userServicesCtrl.reset();
                    this.showSpinner = false;
                    this.hidePaymentButton = true;

                    if (result.paymentIntent.status === 'succeeded') {
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: `Congratulations your payment of ${this.serviceGroup.get('currency').value.toUpperCase()} ${this.serviceGroup.get('amount').value.toFixed(2)} was successful`,
                          panelClass: ['green-snackbar']
                        }
                      );
                    }
                    else {
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: result.paymentIntent.status,
                          panelClass: ['red-snackbar']
                        }
                      );
                    }
                  }
                });
              }
              else {
                console.log('no payment');
                this.showSpinner = false;
                this.hidePaymentButton = false;
              }
            })
            .catch(error => {
              console.error(error);
              this.showSpinner = false;
              this.hidePaymentButton = false;
            })
          }
          else {
            this.showSpinner = false;
            this.hidePaymentButton = false;
          }
        })
        .catch(error => {
          console.error(error);
          this.showSpinner = false;
          this.hidePaymentButton = false;
        });
      }
    }
    else {
      if (this.serviceGroup.get('indexed').value == false){
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'The service has been removed',
            panelClass: ['red-snackbar']
          }
        );
        this.router.navigate(['/']);
      }
      else {
        const snackBarRef = this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: 'The service has already been sold',
            panelClass: ['red-snackbar']
          }
        );
      }
    }
  }

  ngOnInit () {
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this._user = user;
        this.loggedInUserId = user.uid;

        this.route.queryParams.subscribe((params: Params) => {
          this._sellerUid = params['userId']
          this._sellerServiceId = params['serviceId']

          let forumId = params['forumId'];
          let forumUserId = params['forumUserId'];

          if (forumId){
            this.id = of(forumId);
            this.returnUserId = of(forumUserId);
            this.returnType = of('Forum');
          }

          this._userServiceSubscription = this.userServiceService.getService(this._sellerUid, this._sellerServiceId).pipe(take(1))
            .subscribe(service => {
              if (service){
                if (service.paymentType == 'Payment'){
                  if (service.indexed == true && service.paymentId.length == 0){
                    this.sellerService = this.userServiceService.getService(this._sellerUid, this._sellerServiceId);
                    this.initForm();
                  }
                  else {
                    if (service.indexed == false){
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: 'The service is not indexed or available for sale',
                          panelClass: ['red-snackbar']
                        }
                      );
                      this.router.navigate(['/']);
                    }
                    else {
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: 'The service has already been sold',
                          panelClass: ['red-snackbar']
                        }
                      );
                      this.router.navigate(['/']);
                    }
                  }
                }
                else {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: 'Service is free',
                      panelClass: ['red-snackbar']
                    }
                  );
                  this.router.navigate(['/service/detail'], { queryParams: { serviceId: this._sellerServiceId } });
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
          );
        });
      }
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
      typeOfPayment:                      [''],
      currency:                           [''],
      paymentId:                          [''],
      paymentUserId:                      [''],
      includeDescriptionInDetailPage:     [''],
      includeImagesInDetailPage:          [''],
      includeTagsInDetailPage:            [''],
      lastUpdateDate:                     [''],
      creationDate:                       ['']
    });
    this.serviceGroup.get('name').disable();
    this.serviceGroup.get('amount').disable();

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
            typeOfPayment: service.typeOfPayment,
            currency: service.currency,
            paymentId: service.paymentId,
            paymentUserId: service.paymentUserId,
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
                  if (!serviceImages[0].smallDownloadUrl)
                    serviceImages[0].smallDownloadUrl = '../../../../assets/defaultThumbnail.jpg';

                  return of(serviceImages[0]);
                }
                else return of(null);
              })
            )
            .subscribe(serviceImage => {
              if (serviceImage)
                that.defaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  smallDownloadUrl: '../../../../assets/defaultThumbnail.jpg'
                };
                that.defaultServiceImage = of(tempImage);
              }
            });

            // get service tags
            that.serviceTags = that.userServiceTagService.getTags(service.uid, service.serviceId);

            // get end user services
            that.userServices = that.userServiceService.getServices(that.loggedInUserId, that.numberItems, '', [], true, true).pipe(
              map(userServices => {
                return userServices.filter(userService => {
                  if (userService.indexed == true)
                    return true;
                  else
                    return false;
                }).map(userService => {
                  return { ...userService };
                });
              }),
            )

            // get connected user
            that._connectedUserSubscription = that.userService.getUser(service.uid).subscribe(user => {
              if (user){
                that._connectedUser = user;
                that._loadCard.next(true);
              }
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

  public navigateBack () {
    this.location.back();
  }
}
