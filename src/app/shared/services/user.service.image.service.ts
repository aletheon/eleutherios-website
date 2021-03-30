import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceImageService {
  constructor (private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, serviceId: string, imageId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const serviceImageRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/images`).doc(imageId);

      serviceImageRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create (parentUserId: string, serviceId: string, data: any) {
    const userServiceImageRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/images`).doc(data.imageId);

    // Overwrite existing image creationDate with new serviceImage creationDate.
    data.creationDate = firebase.firestore.FieldValue.serverTimestamp();

    userServiceImageRef.set(data);
    return userServiceImageRef.valueChanges();
  }

  public update (parentUserId: string, serviceId: string, imageId: string, data: any) {
    const userServiceImageRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/images`).doc(imageId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return userServiceImageRef.update(data);
  }

  public delete (parentUserId: string, serviceId: string, imageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userServiceImageRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/images`).doc(imageId);
      userServiceImageRef.ref.get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(()=>{
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getDefaultServiceImages (parentUserId: string, serviceId: string): Observable<any> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/images`, ref => ref.where('default', '==', true).limit(1)).valueChanges();
  }

  public getServiceImage (parentUserId: string, serviceId: string, imageId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${serviceId}/images`).doc(imageId).valueChanges();
  }

  public getServiceImages (parentUserId: string, serviceId: string, numberOfItems: number, key?: any): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services/${serviceId}/images`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').limit(numberOfItems+1)).valueChanges();
    else
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').startAt(key).limit(numberOfItems+1)).valueChanges();
  }

  public removeServiceImages (parentUserId: string, serviceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/images`).get().then(snapshot => {
        if (snapshot.size > 0){
          let promises = snapshot.docs.map(doc => {
            return new Promise<void>((resolve, reject) => {
              doc.ref.delete().then(()=>{
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() =>{
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}
