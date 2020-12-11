import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserPaymentService {
  constructor(private afs: AngularFirestore, private fun: AngularFireFunctions, private http: HttpClient ) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, paymentId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const paymentRef = this.afs.collection(`users/${parentUserId}/payments`).doc(paymentId);

      paymentRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getPaymentFromPromise (parentUserId: string, paymentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let paymentRef = this.afs.collection(`users/${parentUserId}/payments`).doc(paymentId);

      paymentRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getPayment (parentUserId: string, paymentId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/payments`).doc(paymentId).valueChanges();
  }

  public create (parentUserId: string, data: any): Observable<any> {
    const paymentRef = this.afs.collection(`users/${parentUserId}/payments`).doc(this.afs.createId());
    data.paymentId = paymentRef.ref.id;
    paymentRef.set(data);
    return paymentRef.valueChanges();
  }

  public update (parentUserId: string, paymentId: string, data: any) {
    const paymentRef = this.afs.collection(`users/${parentUserId}/payments`).doc(paymentId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return paymentRef.update(data);
  }

  public delete (parentUserId: string, paymentId: string) {
    const paymentRef = this.afs.collection(`users/${parentUserId}/payments`).doc(paymentId);
    return paymentRef.delete();
  }
}