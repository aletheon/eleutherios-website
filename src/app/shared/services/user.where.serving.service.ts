import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserWhereServingService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public serviceIsServingInForum (parentUserId: string, serviceId: string, forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const whereServingRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/whereservings`).doc(forumId);

      whereServingRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getWhereServings (parentUserId: string, serviceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/whereservings`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public create (parentUserId: string, serviceId: string, forumId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let whereServing = {
        forumId: forumId,
        creationDate: firebase.firestore.FieldValue.serverTimestamp()
      };

      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/whereservings`).doc(forumId).set(whereServing).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public delete (parentUserId: string, serviceId: string, forumId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/whereservings`).doc(forumId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}