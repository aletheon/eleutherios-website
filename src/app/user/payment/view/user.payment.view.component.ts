import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import {
  SiteTotalService,
  UserPaymentService,
  UserServiceImageService,
  UserServiceTagService,
  UserForumService,
  UserServiceService,
  UserServiceForumBlockService,
  UserForumServiceBlockService,
  UserServiceUserBlockService,
  UserForumUserBlockService,
  UserForumRegistrantService,
  Registrant,
  NoTitlePipe,
  TruncatePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, zip, combineLatest, from } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";


@Component({
  selector: 'user-payment-view',
  templateUrl: './user.payment.view.component.html',
  styleUrls: ['./user.payment.view.component.css']
})
export class UserPaymentViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _userSubscription: Subscription;
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
  public userForums: Observable<any[]>;
  public userForumsCtrl: FormControl;
  public numberItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();
  public loggedInUserId: string = '';

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userPaymentService: UserPaymentService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private userForumService: UserForumService,
    private userServiceService: UserServiceService,
    private userServiceForumBlockService: UserServiceForumBlockService,
    private userForumServiceBlockService: UserForumServiceBlockService,
    private userServiceUserBlockService: UserServiceUserBlockService,
    private userForumUserBlockService: UserForumUserBlockService,
    private userForumRegistrantService: UserForumRegistrantService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
      this.userForumsCtrl = new FormControl();
  }

  ngOnDestroy () {
    if (this._userSubscription)
      this._userSubscription.unsubscribe();

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

  addForum () {
    if (this.userForumsCtrl.value.title.length > 0){
      const sellerServiceSubscription = this.userServiceService.getService(this.paymentGroup.get('sellerUid').value, this.paymentGroup.get('sellerServiceId').value).subscribe(service => {
        sellerServiceSubscription.unsubscribe();

        if (service){
          this.userForumServiceBlockService.serviceIsBlocked(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, service.serviceId)
            .then(serviceBlocked => {
              if (!serviceBlocked) {
                this.userServiceUserBlockService.userIsBlocked(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, service.uid)
                  .then(serviceUserBlock => {
                    if (!serviceUserBlock) {
                      this.userServiceForumBlockService.forumIsBlocked(service.uid, service.serviceId, this.userForumsCtrl.value.forumId)
                        .then(forumBlocked => {
                          if (!forumBlocked) {
                            this.userForumUserBlockService.userIsBlocked(service.uid, service.serviceId, this.userForumsCtrl.value.uid)
                              .then(forumUserBlock => {
                                if (!forumUserBlock) {
                                  this.userForumRegistrantService.serviceIsServingInForumFromPromise(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, service.serviceId)
                                    .then(isServing => {
                                      if (!isServing) {
                                        const newRegistrant: Registrant = {
                                          registrantId: '',
                                          parentId: '',
                                          serviceId: service.serviceId,
                                          uid: service.uid,
                                          forumId: this.userForumsCtrl.value.forumId,
                                          forumUid: this.userForumsCtrl.value.uid,
                                          default: false,
                                          creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                                          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                                        };

                                        this.userForumRegistrantService.getDefaultUserRegistrantFromPromise(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, service.uid)
                                          .then(registrant => {
                                            if (registrant == null)
                                              newRegistrant.default = true;

                                            this.userForumRegistrantService.create(this.userForumsCtrl.value.uid, this.userForumsCtrl.value.forumId, newRegistrant).then(() => {
                                              // do something
                                            })
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
                                      else {
                                        const snackBarRef = this.snackbar.openFromComponent(
                                          NotificationSnackBar,
                                          {
                                            duration: 8000,
                                            data: `The service '${service.title}' is already serving in the forum '${this.userForumsCtrl.value.title}'`,
                                            panelClass: ['red-snackbar']
                                          }
                                        );
                                      }
                                    })
                                    .catch((error) => {
                                      console.log("error adding forum to service " + JSON.stringify(error));
                                    }
                                  );
                                }
                                else {
                                  const snackBarRef = this.snackbar.openFromComponent(
                                    NotificationSnackBar,
                                    {
                                      duration: 8000,
                                      data: `The user of the forum '${this.userForumsCtrl.value.title}' has been blocked from requesting the service '${service.title}'`,
                                      panelClass: ['red-snackbar']
                                    }
                                  );
                                }
                              })
                              .catch((error) => {
                                console.log("error adding forum to service " + JSON.stringify(error));
                              }
                            );
                          }
                          else {
                            const snackBarRef = this.snackbar.openFromComponent(
                              NotificationSnackBar,
                              {
                                duration: 8000,
                                data: `The forum '${this.userForumsCtrl.value.title}' has been blocked from requesting the service '${service.title}'`,
                                panelClass: ['red-snackbar']
                              }
                            );
                          }
                        })
                        .catch((error) => {
                          console.log("error adding forum to service " + JSON.stringify(error));
                        }
                      );
                    }
                    else {
                      const snackBarRef = this.snackbar.openFromComponent(
                        NotificationSnackBar,
                        {
                          duration: 8000,
                          data: `The user of the service '${service.title}' has been blocked from serving in the forum '${this.userForumsCtrl.value.title}'`,
                          panelClass: ['red-snackbar']
                        }
                      );
                    }
                  })
                  .catch((error) => {
                    console.log("error adding forum to service " + JSON.stringify(error));
                  }
                );
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `The service '${service.title}' has been blocked from serving in the forum '${this.userForumsCtrl.value.title}'`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            })
            .catch((error) => {
              console.log("error adding forum to service " + JSON.stringify(error));
            }
          );
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Service does not exist or was removed',
              panelClass: ['red-snackbar']
            }
          );
        }
      });
    }
    else {
      const snackBarRef = this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: `Forum is missing a title`,
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  ngOnInit () {
    this._loading.next(true);

    this._userSubscription = this.auth.user.pipe(take(1)).subscribe(user => {
      if (user){
        this.loggedInUserId = user.uid;

        this.route.queryParams.subscribe((params: Params) => {
          this._initialPaymentSubscription = this.userPaymentService.getPayment(this.loggedInUserId, params['paymentId']).pipe(take(1)).subscribe(payment => {
            if (payment){
              this.payment = this.userPaymentService.getPayment(this.loggedInUserId, params['paymentId']).pipe(
                switchMap(payment => {
                  if (payment){
                    let getBuyerService$ = this.userServiceService.getService(payment.buyerUid, payment.buyerServiceId);
                    let getSellerService$ = this.userServiceService.getService(payment.sellerUid, payment.sellerServiceId);

                    return combineLatest([getBuyerService$, getSellerService$]).pipe(
                      switchMap(results => {
                        const [buyerService, sellerService] = results;

                        if (buyerService){
                          payment.buyerType = buyerService.type;
                          payment.buyerPaymentType = buyerService.paymentType;
                          payment.buyerTitle = buyerService.title;
                          payment.buyerDescription = buyerService.description;
                        }
                        else {
                          payment.buyerType = 'No service';
                          payment.buyerPaymentType = 'No service';
                          payment.buyerTitle = 'No service';
                          payment.buyerDescription = '';
                        }

                        if (sellerService){
                          payment.sellerType = sellerService.type;
                          payment.sellerPaymentType = sellerService.paymentType;
                          payment.sellerTitle = sellerService.title;
                          payment.sellerDescription = sellerService.description;
                        }
                        else {
                          payment.sellerType = 'No service';
                          payment.sellerPaymentType = 'No service';
                          payment.sellerTitle = 'No service';
                          payment.sellerDescription = '';
                        }
                        return of(payment);
                      })
                    );
                  }
                  else return of(null);
                })
              );
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
        that.paymentGroup.patchValue(payment);
      }
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

            // forums this user has created so they can request the service serve in their forum(s)
            that.userForums = that.userForumService.getForums(that.loggedInUserId, that.numberItems, '', [], true, true);
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
