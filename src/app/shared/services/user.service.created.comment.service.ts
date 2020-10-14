import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceCreatedCommentService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getCreatedComments (parentUserId: string, serviceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/servicecreatedcomments`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public create (parentUserId: string, serviceId: string, data: any): Observable<any> {
    const serviceCreatedCommentRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedcomments`).doc(this.afs.createId());
    data.serviceCreatedCommentId = serviceCreatedCommentRef.ref.id;
    serviceCreatedCommentRef.set(data);
    return serviceCreatedCommentRef.valueChanges();
  }

  public delete (parentUserId: string, serviceId: string, serviceCreatedCommentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedcomments`).doc(serviceCreatedCommentId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}