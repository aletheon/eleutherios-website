import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  SiteTotalService,
  UserReceiptService,
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
  selector: 'user-receipt-view',
  templateUrl: './user.receipt.view.component.html',
  styleUrls: ['./user.receipt.view.component.css']
})
export class UserReceiptViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialReceiptSubscription: Subscription;
  private _receiptSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _serviceTagSubscription: Subscription;
  
  public receiptGroup: FormGroup;
  public receipt: Observable<any>;
  public defaultServiceImage: Observable<any>;
  public serviceTags: Observable<any[]>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userReceiptService: UserReceiptService,
    private userServiceImageService: UserServiceImageService,
    private userServiceTagService: UserServiceTagService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._initialReceiptSubscription)
      this._initialReceiptSubscription.unsubscribe();

    if (this._receiptSubscription)
      this._receiptSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._serviceTagSubscription)
      this._serviceTagSubscription.unsubscribe();
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
      this._loading.next(false);
    });

    // run once subscription
    const runOnceSubscription = this.receipt.subscribe(receipt => {
      if (receipt){
        let load = async function(){
          try {
            that._defaultServiceImageSubscription = that.userServiceImageService.getDefaultServiceImages(receipt.buyerUid, receipt.buyerServiceId).pipe(
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

            that._serviceTagSubscription = that.userServiceTagService.getTags(receipt.buyerUid, receipt.buyerServiceId).subscribe(serviceTags => {
              if (serviceTags && serviceTags.length > 0)
                that.serviceTags = of(serviceTags);
              else
                that.serviceTags = of([]);
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