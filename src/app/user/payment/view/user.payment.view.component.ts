import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder } from '@angular/forms';
import {
  UserPaymentService
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-payment-view',
  templateUrl: './user.payment.view.component.html',
  styleUrls: ['./user.payment.view.component.css']
})
export class UserPaymentViewComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialPaymentSubscription: Subscription;
  private _paymentSubscription: Subscription;
  
  public paymentGroup: FormGroup;
  public payment: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userPaymentService: UserPaymentService,
    private fb: FormBuilder, 
    private router: Router,
    private snackbar: MatSnackBar) {
  }

  ngOnDestroy () {
    if (this._initialPaymentSubscription)
      this._initialPaymentSubscription.unsubscribe();

    if (this._paymentSubscription)
      this._paymentSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._initialPaymentSubscription = this.userPaymentService.getPayment(this.auth.uid, params['paymentId']).subscribe(payment => {
        if (payment){
          this._initialPaymentSubscription.unsubscribe();
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
    this._paymentSubscription = this.payment.subscribe(payment => {
      if (payment){
        this.paymentGroup.patchValue(payment);
      }
      this._loading.next(false);
    });
  }
}