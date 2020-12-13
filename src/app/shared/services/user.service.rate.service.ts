import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserServiceRateService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public create(parentUserId: string, parentServiceId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const userServiceRateRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).doc(this.afs.createId());
      data.serviceRateId = userServiceRateRef.ref.id;
      userServiceRateRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update(parentUserId: string, parentServiceId: string, data: any) {
    const userServiceRateRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).doc(data.serviceRateId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return userServiceRateRef.update(data);
  }

  public delete (parentUserId: string, parentServiceId: string, serviceRateId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).doc(serviceRateId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public userServiceRateExists (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).ref
        .where('serviceUid', '==', userId)
        .where('serviceId', '==', serviceId);

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0)
            resolve(true);
          else
            resolve(false); 
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getServiceRateFromPromise (parentUserId: string, parentServiceId: string, serviceRateId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let serviceRateRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).doc(serviceRateId);

      serviceRateRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            reject(`ServiceRate with serviceRateId ${serviceRateId} was not found`);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }
  
  public getServiceRate (parentUserId: string, parentServiceId: string, serviceRateId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).doc(serviceRateId).valueChanges();
  }

  public getUserServiceRateFromPromise (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`).ref
        .where('serviceUid', '==', userId)
        .where('serviceId', '==', serviceId);

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0)
            resolve(snapshot.docs[0].data());
          else
            reject(`ServiceRate with serviceId ${serviceId} was not found`);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getUserServiceRate (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicerates`, (ref) => ref.where('serviceUid', '==', userId).where('serviceId', '==', serviceId).limit(1)).valueChanges();
  }

  public getServiceRates (parentUserId: string, parentServiceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${parentServiceId}/servicerates`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public getAllServiceRates(parentUserId: string, serviceId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/services/${serviceId}/servicerates`;

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
  }

  public getAllUserServiceRates(parentUserId: string, parentServiceId: string, userId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/services/${parentServiceId}/servicerates`;

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('serviceUid', '==', userId).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('serviceUid', '==', userId).startAt(key).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
  }
}