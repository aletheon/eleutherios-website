import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserReceiptService {
  constructor(private afs: AngularFirestore, private fun: AngularFireFunctions, private http: HttpClient ) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, receiptId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const receiptRef = this.afs.collection(`users/${parentUserId}/receipts`).doc(receiptId);

      receiptRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getReceiptFromPromise (parentUserId: string, receiptId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let receiptRef = this.afs.collection(`users/${parentUserId}/receipts`).doc(receiptId);

      receiptRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            resolve(null);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getReceipt (parentUserId: string, receiptId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/receipts`).doc(receiptId).valueChanges();
  }

  public create (parentUserId: string, data: any): Observable<any> {
    const receiptRef = this.afs.collection(`users/${parentUserId}/receipts`).doc(this.afs.createId());
    data.receiptId = receiptRef.ref.id;
    receiptRef.set(data);
    return receiptRef.valueChanges();
  }

  public update (parentUserId: string, receiptId: string, data: any) {
    const receiptRef = this.afs.collection(`users/${parentUserId}/receipts`).doc(receiptId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return receiptRef.update(data);
  }

  public delete (parentUserId: string, receiptId: string) {
    const receiptRef = this.afs.collection(`users/${parentUserId}/receipts`).doc(receiptId);
    return receiptRef.delete();
  }

  public getReceipts (parentUserId: string, numberOfItems: number, key?: any): Observable<any[]> {
    if (!key)
      return this.afs.collection<any>(`users/${parentUserId}/receipts`, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
    else
      return this.afs.collection<any>(`users/${parentUserId}/receipts`, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
  }
}
