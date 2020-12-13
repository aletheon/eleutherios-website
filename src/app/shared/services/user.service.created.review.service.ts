import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceCreatedReviewService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getCreatedReviews (parentUserId: string, serviceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/servicecreatedreviews`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public create (parentUserId: string, serviceId: string, data: any): Observable<any> {
    const serviceCreatedReviewRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedreviews`).doc(this.afs.createId());
    data.serviceCreatedReviewId = serviceCreatedReviewRef.ref.id;
    serviceCreatedReviewRef.set(data);
    return serviceCreatedReviewRef.valueChanges();
  }

  public delete (parentUserId: string, serviceId: string, serviceCreatedReviewId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedreviews`).doc(serviceCreatedReviewId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}