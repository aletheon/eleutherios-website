import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public serviceIsBlocked(parentUserId: string, forumId: string, serviceId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const serviceBlockRef = this.afs.collection(`users/${parentUserId}/serviceblocks`).ref.where('serviceId', '==', serviceId).where('forumId', '==', forumId);
      serviceBlockRef.get().then(querySnapshot => {
        if (querySnapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create(parentUserId: string, forumId: string, serviceId: string, data: any) {
    return new Promise((resolve, reject) => {
      const serviceBlockExistRef = this.afs.collection(`users/${parentUserId}/serviceblocks`).ref.where('serviceId', '==', serviceId).where('forumId', '==', forumId);
      serviceBlockExistRef.get().then(querySnapshot => {
        if (querySnapshot.size == 0){
          const serviceBlockRef = this.afs.collection(`users/${parentUserId}/serviceblocks`).doc(this.afs.createId());
          data.serviceBlockId = serviceBlockRef.ref.id;
          serviceBlockRef.set(data).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  }

  public update(parentUserId: string, serviceBlockId: string, data: any){
    const serviceBlockRef = this.afs.collection(`users/${parentUserId}/serviceblocks`).doc(serviceBlockId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return serviceBlockRef.update(data);
  }

  public delete(parentUserId: string, forumId: string, serviceId: string){
    return new Promise((resolve, reject) => {
      const serviceBlockExistRef = this.afs.collection(`users/${parentUserId}/serviceblocks`).ref.where('serviceId', '==', serviceId).where('forumId', '==', forumId);
      serviceBlockExistRef.get().then(snapshot => {
        if (snapshot.size > 0){
          snapshot.docs[0].ref.delete().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  }

  public getUserServiceBlocks(parentUserId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/serviceblocks`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').limit(numberOfItems+1)).valueChanges();
    else 
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').startAt(key).limit(numberOfItems+1)).valueChanges();
  }
}