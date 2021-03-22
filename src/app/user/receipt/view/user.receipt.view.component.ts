import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';
import {
  SiteTotalService,
  UserReceiptService,
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
import { switchMap } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";


@Component({
  selector: 'user-receipt-view',
  templateUrl: './user.receipt.view.component.html',
  styleUrls: ['./user.receipt.view.component.css']
})
export class UserReceiptViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialReceiptSubscription: Subscription;
  private _receiptSubscription: Subscription;
  private _sellerServiceSubscription: Subscription;
  private _buyerServiceSubscription: Subscription;
  private _sellerDefaultServiceImageSubscription: Subscription;
  private _buyerDefaultServiceImageSubscription: Subscription;
  private _buyerServiceTagSubscription: Subscription;

  public receiptGroup: FormGroup;
  public receipt: Observable<any>;
  public buyerDefaultServiceImage: Observable<any>;
  public sellerDefaultServiceImage: Observable<any>;
  public buyerServiceTags: Observable<any[]>;
  public userForums: Observable<any[]>;
  public userForumsCtrl: FormControl;
  public numberItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userReceiptService: UserReceiptService,
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
    if (this._initialReceiptSubscription)
      this._initialReceiptSubscription.unsubscribe();

    if (this._receiptSubscription)
      this._receiptSubscription.unsubscribe();

    if (this._sellerServiceSubscription)
      this._sellerServiceSubscription.unsubscribe();

    if (this._buyerServiceSubscription)
      this._buyerServiceSubscription.unsubscribe();

    if (this._sellerDefaultServiceImageSubscription)
      this._sellerDefaultServiceImageSubscription.unsubscribe();

    if (this._buyerDefaultServiceImageSubscription)
      this._buyerDefaultServiceImageSubscription.unsubscribe();

    if (this._buyerServiceTagSubscription)
      this._buyerServiceTagSubscription.unsubscribe();
  }

  addForum () {
    if (this.userForumsCtrl.value.title.length > 0){
      const sellerServiceSubscription = this.userServiceService.getService(this.receiptGroup.get('buyerUid').value, this.receiptGroup.get('buyerServiceId').value).subscribe(service => {
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

    this.route.queryParams.subscribe((params: Params) => {
      this._initialReceiptSubscription = this.userReceiptService.getReceipt(this.auth.uid, params['receiptId']).subscribe(receipt => {
        this._initialReceiptSubscription.unsubscribe();

        if (receipt){
          this.receipt = this.userReceiptService.getReceipt(this.auth.uid, params['receiptId']);
          this.initForm();
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'Receipt does not exist or was recently removed',
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

    this.receiptGroup = this.fb.group({
      receiptId:                        [''],
      uid:                              [''],
      paymentId:                        [''],
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
    this._receiptSubscription = this.receipt.subscribe(receipt => {
      if (receipt){
        this.receiptGroup.patchValue(receipt);
      }
    });

    // run once subscription
    const runOnceSubscription = this.receipt.subscribe(receipt => {
      if (receipt){
        let load = async function(){
          try {
            that._buyerServiceSubscription = that.userServiceService.getService(receipt.buyerUid, receipt.buyerServiceId).subscribe(service => {
              if (service){
                that.receiptGroup.get('buyerType').setValue(service.type);
                that.receiptGroup.get('buyerPaymentType').setValue(service.paymentType);
                that.receiptGroup.get('buyerTitle').setValue(service.title);
                that.receiptGroup.get('buyerDescription').setValue(service.description);
              }
            });

            that._sellerServiceSubscription = that.userServiceService.getService(receipt.sellerUid, receipt.sellerServiceId).subscribe(service => {
              if (service){
                that.receiptGroup.get('sellerType').setValue(service.type);
                that.receiptGroup.get('sellerPaymentType').setValue(service.paymentType);
                that.receiptGroup.get('sellerTitle').setValue(service.title);
                that.receiptGroup.get('sellerDescription').setValue(service.description);
              }
            });

            that._buyerDefaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(receipt.buyerUid, receipt.buyerServiceId).pipe(
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
                that.buyerDefaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultThumbnail.jpg'
                };
                that.buyerDefaultServiceImage = of(tempImage);
              }
            });

            that._sellerDefaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(receipt.sellerUid, receipt.sellerServiceId).pipe(
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
                that.sellerDefaultServiceImage = of(serviceImage);
              else {
                let tempImage = {
                  url: '../../../assets/defaultTiny.jpg'
                };
                that.sellerDefaultServiceImage = of(tempImage);
              }
            });

            that._buyerServiceTagSubscription = that.userServiceTagService.getTags(receipt.buyerUid, receipt.buyerServiceId).subscribe(serviceTags => {
              if (serviceTags && serviceTags.length > 0)
                that.buyerServiceTags = of(serviceTags);
              else
                that.buyerServiceTags = of([]);
            });

            // forums this user has created so they can request the service serve in their forum(s)
            that.userForums = that.userForumService.getForums(that.auth.uid, that.numberItems, '', [], true, true);
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
