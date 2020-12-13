import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserServiceReviewService {
  constructor(public afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public create(parentUserId: string, parentServiceId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const userServiceReviewRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).doc(this.afs.createId());
      data.serviceReviewId = userServiceReviewRef.ref.id;
      userServiceReviewRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update(parentUserId: string, parentServiceId: string, data: any) {
    const userServiceReviewRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).doc(data.serviceReviewId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return userServiceReviewRef.update(data);
  }

  public delete (parentUserId: string, parentServiceId: string, serviceReviewId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).doc(serviceReviewId).delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public userServiceReviewExists (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).ref
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

  public getServiceReviewFromPromise (parentUserId: string, parentServiceId: string, serviceReviewId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let serviceReviewRef = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).doc(serviceReviewId);

      serviceReviewRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            reject(`ServiceReview with serviceReviewId ${serviceReviewId} was not found`);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }
  
  public getServiceReview (parentUserId: string, parentServiceId: string, serviceReviewId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).doc(serviceReviewId).valueChanges();
  }

  public getUserServiceReviewFromPromise (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`).ref
        .where('serviceUid', '==', userId)
        .where('serviceId', '==', serviceId);

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0)
            resolve(snapshot.docs[0].data());
          else
            reject(`ServiceReview with serviceId ${serviceId} was not found`);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getUserServiceReview (parentUserId: string, parentServiceId: string, userId: string, serviceId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${parentServiceId}/servicereviews`, (ref) => ref.where('serviceUid', '==', userId).where('serviceId', '==', serviceId).limit(1)).valueChanges();
  }

  public getServiceReviews (parentUserId: string, parentServiceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${parentServiceId}/servicereviews`, ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  public getAllServiceReviews(parentUserId: string, serviceId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/services/${serviceId}/servicereviews`;

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

  public getAllUserServiceReviews(parentUserId: string, parentServiceId: string, userId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/services/${parentServiceId}/servicereviews`;

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