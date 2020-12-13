import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceReviewCommentService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getComments (parentUserId: string, serviceId: string, serviceReviewId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public create (parentUserId: string, serviceId: string, serviceReviewId: string, data: any): Observable<any> {
    const serviceReviewCommentRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`).doc(this.afs.createId());
    data.serviceReviewCommentId = serviceReviewCommentRef.ref.id;
    serviceReviewCommentRef.set(data);
    return serviceReviewCommentRef.valueChanges();
  }

  public delete (parentUserId: string, serviceId: string, serviceReviewId: string, serviceReviewCommentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/servicereviews/${serviceReviewId}/servicereviewcomments`).doc(serviceReviewCommentId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}