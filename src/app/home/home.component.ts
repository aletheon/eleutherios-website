import { Component, OnInit, OnDestroy } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  UserServiceService,
  UserForumService,
  UserServiceImageService,
  UserForumImageService,
  UserForumTagService,
  UserServiceTagService,
  UserForumRegistrantService,
  UserReceiptService,
  UserPaymentService,
  ForumService,
  ServiceService,
  AppearDirective,
  NoTitlePipe
} from '../shared';

import { NotificationSnackBar } from '../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy, OnInit {
  private _loading = new BehaviorSubject(false);
  private _alertSubscription: Subscription;
  private _publicForumsSubscription: Subscription;
  private _publicServicesSubscription: Subscription;
  private _privateForumsSubscription: Subscription;
  private _privateServicesSubscription: Subscription;
  private _receiptsSubscription: Subscription;
  private _paymentsSubscription: Subscription;

  public publicForums: Observable<any[]>;
  public publicServices: Observable<any[]>;
  public privateForums: Observable<any[]>;
  public privateServices: Observable<any[]>;
  public receipts: Observable<any[]>;
  public payments: Observable<any[]>;
  public alerts: Observable<any[]>;
  public publicForumsNumberOfItems: number = 100;
  public publicServicesNumberOfItems: number = 100;
  public privateForumsNumberOfItems: number = 100;
  public privateServicesNumberOfItems: number = 100;
  public receiptsNumberOfItems: number = 100;
  public paymentsNumberOfItems: number = 100;
  public alertsNumberOfItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public afAuth: AngularFireAuth,
    public auth: AuthService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userServiceImageService: UserServiceImageService,
    private userForumImageService: UserForumImageService,
    private userForumTagService: UserForumTagService,
    private userServiceTagService: UserServiceTagService,
    private userForumRegistrantService: UserForumRegistrantService,
    private userReceiptService: UserReceiptService,
    private userPaymentService: UserPaymentService,
    private forumService: ForumService,
    private serviceService: ServiceService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  changeForumType (forum) {
    this.userForumService.getForumFromPromise(forum.uid, forum.forumId)
      .then(fetchedForum => {
        if (fetchedForum){
          if (fetchedForum.type == 'Public')
            fetchedForum.type = 'Private';
          else
            fetchedForum.type = 'Public';

          this.userForumService.update(fetchedForum.uid, fetchedForum.forumId, fetchedForum);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Forum with forumId ${forum.forumId} does not exist or was removed`,
              panelClass: ['red-snackbar']
            }
          );
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
    });
  }

  changeServiceType (service) {
    this.userServiceService.getServiceFromPromise(service.uid, service.serviceId)
      .then(fetchedService => {
        if (fetchedService){
          if (fetchedService.type == 'Public')
            fetchedService.type = 'Private';
          else
            fetchedService.type = 'Public';

          this.userServiceService.update(fetchedService.uid, fetchedService.serviceId, fetchedService);
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `Service with serviceId ${service.serviceId} does not exist or was removed`,
              panelClass: ['red-snackbar']
            }
          );
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
    });
  }

  deleteForum (forum) {
    this.userForumService.delete(forum.uid, forum.forumId);
  }

  deleteService (service) {
    this.userServiceService.delete(service.uid, service.serviceId);
  }

  deleteReceipt (receipt) {
    this.userReceiptService.delete(receipt.uid, receipt.receiptId);
  }

  deletePayment (payment) {
    this.userPaymentService.delete(payment.uid, payment.paymentId);
  }

  ngOnDestroy () {
    if (this._alertSubscription)
      this._alertSubscription.unsubscribe();

    if (this._publicForumsSubscription)
      this._publicForumsSubscription.unsubscribe();

    if (this._publicServicesSubscription)
      this._publicServicesSubscription.unsubscribe();

    if (this._privateForumsSubscription)
      this._privateForumsSubscription.unsubscribe();

    if (this._privateServicesSubscription)
      this._privateServicesSubscription.unsubscribe();

    if (this._receiptsSubscription)
      this._receiptsSubscription.unsubscribe();

    if (this._paymentsSubscription)
      this._paymentsSubscription.unsubscribe();
  }

  trackPrivateServices (index, service) { return service.serviceId; }
  trackPublicForums (index, forum) { return forum.forumId; }
  trackPublicServices (index, service) { return service.serviceId; }
  trackReceipts (index, receipt) { return receipt.receiptId; }
  trackPayments (index, payment) { return payment.paymentId; }
  trackPrivateForums (index, forum) { return forum.forumId; }

  ngOnInit () {
    const that = this;

    this._loading.next(true);
    let load = async function(){
      try {
        // public forums
        that._publicForumsSubscription = that.forumService.getForums(that.publicForumsNumberOfItems, '', [], true, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
                  let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                    switchMap(forumImages => {
                      if (forumImages && forumImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;

                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../assets/defaultTiny.jpg';

                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../assets/defaultTiny.jpg'
                        };
                        forum.defaultForumImage = of(tempImage);
                      }

                      if (defaultRegistrant)
                        forum.defaultRegistrant = of(defaultRegistrant);
                      else
                        forum.defaultRegistrant = of(null);

                      return of(forum);
                    })
                  );
                }
                else return of(null);
              });

              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return forums[i];
                });
              });
            }
            else return of([]);
          })
        ).subscribe(forums => {
          that.publicForums = of(forums);
        });

        // public services
        that._publicServicesSubscription = that.serviceService.getServices(that.publicServicesNumberOfItems, '', [], true, true).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
                              serviceImages[0].url = '../../assets/defaultTiny.jpg';

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
                          url: '../../assets/defaultTiny.jpg'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }
                      return of(service);
                    })
                  );
                }
                else return of(null);
              });

              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        ).subscribe(services => {
          that.publicServices = of(services);
        });

        // private forums
        that._privateForumsSubscription = that.userForumService.getForums(that.auth.uid, that.privateForumsNumberOfItems, '', [], true, false).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
                  let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                    switchMap(forumImages => {
                      if (forumImages && forumImages.length > 0){
                        let getDownloadUrl$: Observable<any>;

                        if (forumImages[0].tinyUrl)
                          getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

                        return combineLatest([getDownloadUrl$]).pipe(
                          switchMap(results => {
                            const [downloadUrl] = results;

                            if (downloadUrl)
                              forumImages[0].url = downloadUrl;
                            else
                              forumImages[0].url = '../../assets/defaultTiny.jpg';

                            return of(forumImages[0]);
                          })
                        );
                      }
                      else return of(null);
                    })
                  );

                  let getDefaultRegistrant$ = that.userForumRegistrantService.getDefaultUserRegistrant(forum.uid, forum.forumId, that.auth.uid).pipe(
                    switchMap(registrants => {
                      if (registrants && registrants.length > 0)
                        return of(registrants[0]);
                      else
                        return of(null);
                    })
                  );

                  return combineLatest([getDefaultForumImage$, getDefaultRegistrant$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, defaultRegistrant] = results;

                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          url: '../../assets/defaultTiny.jpg'
                        };
                        forum.defaultForumImage = of(tempImage);
                      }

                      if (defaultRegistrant)
                        forum.defaultRegistrant = of(defaultRegistrant);
                      else
                        forum.defaultRegistrant = of(null);

                      return of(forum);
                    })
                  );
                }
                else return of(null);
              });

              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return forums[i];
                });
              });
            }
            else return of([]);
          })
        ).subscribe(forums => {
          that.privateForums = of(forums);
        });

        // private services
        that._privateServicesSubscription = that.userServiceService.getServices(that.auth.uid, that.privateServicesNumberOfItems, '', [], true, false).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
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
                              serviceImages[0].url = '../../assets/defaultTiny.jpg';

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
                          url: '../../assets/defaultTiny.jpg'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }
                      return of(service);
                    })
                  );
                }
                else return of(null);
              });

              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          })
        ).subscribe(services => {
          that.privateServices = of(services);
        });

        // receipts
        that._receiptsSubscription = that.userReceiptService.getReceipts(that.auth.uid, that.receiptsNumberOfItems).pipe(
          switchMap(receipts => {
            if (receipts && receipts.length > 0){
              let observables = receipts.map(receipt => {
                let getBuyerService$ = that.userServiceService.getService(receipt.buyerUid, receipt.buyerServiceId);
                let getSellerService$ = that.userServiceService.getService(receipt.sellerUid, receipt.sellerServiceId);
                let getBuyerDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(receipt.buyerUid, receipt.buyerServiceId).pipe(
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
                            serviceImages[0].url = '../../assets/defaultThumbnail.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getSellerDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(receipt.sellerUid, receipt.sellerServiceId).pipe(
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
                            serviceImages[0].url = '../../assets/defaultiny.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getBuyerServiceTags$ = that.userServiceTagService.getTags(receipt.buyerUid, receipt.buyerServiceId);

                return combineLatest([getBuyerService$, getSellerService$, getBuyerDefaultServiceImage$, getSellerDefaultServiceImage$, getBuyerServiceTags$]).pipe(
                  switchMap(results => {
                    const [buyerService, sellerService, buyerDefaultServiceImage, sellerDefaultServiceImage, buyerServiceTags] = results;

                    if (sellerDefaultServiceImage)
                      receipt.sellerDefaultServiceImage = of(sellerDefaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../assets/defaultTiny.jpg'
                      };
                      receipt.sellerDefaultServiceImage = of(tempImage);
                    }

                    if (buyerDefaultServiceImage)
                      receipt.buyerDefaultServiceImage = of(buyerDefaultServiceImage);
                    else {
                      let tempImage = {
                        url: '../../assets/defaultThumbnail.jpg'
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
        ).subscribe(receipts => {
          that.receipts = of(receipts);
        });

        // payments
        that._paymentsSubscription = that.userPaymentService.getPayments(that.auth.uid, that.paymentsNumberOfItems).pipe(
          switchMap(payments => {
            if (payments && payments.length > 0){
              let observables = payments.map(payment => {
                let getSellerService$ = that.userServiceService.getService(payment.sellerUid, payment.sellerServiceId);
                let getBuyerService$ = that.userServiceService.getService(payment.buyerUid, payment.buyerServiceId);
                let getSellerDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(payment.sellerUid, payment.sellerServiceId).pipe(
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
                            serviceImages[0].url = '../../assets/defaultThumbnail.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getBuyerDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(payment.buyerUid, payment.buyerServiceId).pipe(
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
                            serviceImages[0].url = '../../assets/defaultTiny.jpg';

                          return of(serviceImages[0]);
                        })
                      );
                    }
                    else return of(null);
                  })
                );
                let getSellerServiceTags$ = that.userServiceTagService.getTags(payment.sellerUid, payment.sellerServiceId);

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
        ).subscribe(payments => {
          that.payments = of(payments);
        });
      }
      catch (error) {
        throw error;
      }
    }

    // call load
    load().then(() => {
      this._loading.next(false);
    })
    .catch((error) =>{
      console.log('initForm ' + error);
      // this.router.navigate(['/login']);
    });
  }
}
