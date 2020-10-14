import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserAlertService {
  constructor (private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public update (parentUserId: string, alertId: string, data: any) {
    const alertRef = this.afs.collection(`users/${parentUserId}/alerts`).doc(alertId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return alertRef.update(data);
  }

  public delete (parentUserId: string, alertId: string) {
    return new Promise((resolve, reject) => {
      // const alertRef = this.afs.collection('alerts').doc(alertId); // redundant public container so clients can access alerts with alertId without having to know the userId
      const userAlertRef = this.afs.collection(`users/${parentUserId}/alerts`).doc(alertId); // private user container

      userAlertRef.delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getAlerts (parentUserId: string, type: string, numberOfItems: number, key?: any): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/alerts`;

    if (!key){
      if (type == 'All'){
        return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
      }
      else if (type == 'Forum'){
        return this.afs.collection<any>(collectionName, ref => ref.where('type', '==', 'Forum').orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
      }
      else {
        return this.afs.collection<any>(collectionName, ref => ref.where('type', '==', 'Service').orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
      }
    }
    else {
      if (type == 'All'){
        return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
      }
      else if (type == 'Forum'){
        return this.afs.collection<any>(collectionName, ref => ref.where('type', '==', 'Forum').orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
      }
      else {
        return this.afs.collection<any>(collectionName, ref => ref.where('type', '==', 'Service').orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
      }
    }
  }
}