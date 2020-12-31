import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  UserReceiptService
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-receipt-view',
  templateUrl: './user.receipt.view.component.html',
  styleUrls: ['./user.receipt.view.component.css']
})
export class UserReceiptViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialReceiptSubscription: Subscription;
  private _receiptSubscription: Subscription;
  
  public receiptGroup: FormGroup;
  public receipt: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userReceiptService: UserReceiptService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._initialReceiptSubscription)
      this._initialReceiptSubscription.unsubscribe();

    if (this._receiptSubscription)
      this._receiptSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._initialReceiptSubscription = this.userReceiptService.getReceipt(this.auth.uid, params['receiptId']).subscribe(receipt => {
        if (receipt){
          this._initialReceiptSubscription.unsubscribe();
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
      title:                            [''],
      description:                      [''],
      quantity:                         [''],
      status:                           [''],
      buyerUid:                         [''],
      buyerServiceId:                   [''],
      sellerUid:                        [''],
      sellerServiceId:                  [''],
      paymentIntent:                    [''],
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
  }
}