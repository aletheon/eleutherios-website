import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceCreatedRateService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getCreatedRates (parentUserId: string, serviceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/servicecreatedrates`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public create (parentUserId: string, serviceId: string, data: any): Observable<any> {
    const serviceCreatedRateRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedrates`).doc(this.afs.createId());
    data.serviceCreatedRateId = serviceCreatedRateRef.ref.id;
    serviceCreatedRateRef.set(data);
    return serviceCreatedRateRef.valueChanges();
  }

  public delete (parentUserId: string, serviceId: string, serviceCreatedRateId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/servicecreatedrates`).doc(serviceCreatedRateId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}