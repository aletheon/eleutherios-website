import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

// PRIVATE WHEN BLOCKING

// users/${userId}/serviceblocks/${serviceId}
// serviceId: 99999 - service being blocked
// forumId: 99999 - forum doing the blocking

// users/${parentUserId}/serviceuserblocks/${userId}
// userId: 99999 - user being blocked
// forumId: 99999 - forum doing the blocking

// users/${parentUserId}/forumblocks/${forumId}
// forumId: 99999 - forum being blocked
// serviceId: 99999 - service doing the blocking

// users/${userId}/forumuserblocks/${forumId}
// userId: 99999 - user being blocked
// serviceId: 99999 - service doing the blocking

// PRIVATE WHEN BLOCKED

// users/${userId}/forums/${forumId}/serviceblocks
// users/${userId}/forums/${forumId}/userblocks

// users/${userId}/services/${serviceId}/forumblocks
// users/${userId}/services/${serviceId}/userblocks

// PUBLIC WHEN BLOCKED

// forums/${forumId}/serviceblocks
// forums/${forumId}/userblocks

// services/${serviceId}/forumblocks
// services/${serviceId}/userblocks


@Injectable()
export class UserForumBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public forumIsBlocked (parentUserId: string, serviceId: string, forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const forumBlockRef = this.afs.collection(`users/${parentUserId}/forumblocks`).ref.where('forumId', '==', forumId).where('serviceId', '==', serviceId);
      forumBlockRef.get().then(querySnapshot => {
        if (querySnapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create (parentUserId: string, serviceId: string, forumId: string, data: any) {
    return new Promise((resolve, reject) => {
      const forumBlockExistRef = this.afs.collection(`users/${parentUserId}/forumblocks`).ref.where('forumId', '==', forumId).where('serviceId', '==', serviceId);
      forumBlockExistRef.get().then(querySnapshot => {
        if (querySnapshot.size == 0){
          const forumBlockRef = this.afs.collection(`users/${parentUserId}/forumblocks`).doc(this.afs.createId());
          data.forumBlockId = forumBlockRef.ref.id;
          forumBlockRef.set(data).then(() => {
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

  public update (parentUserId: string, forumBlockId: string, data: any){
    const forumBlockRef = this.afs.collection(`users/${parentUserId}/forumblocks`).doc(forumBlockId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return forumBlockRef.update(data);
  }

  public delete (parentUserId: string, serviceId: string, forumId: string){
    return new Promise((resolve, reject) => {
      const forumBlockExistRef = this.afs.collection(`users/${parentUserId}/forumblocks`).ref.where('forumId', '==', forumId).where('serviceId', '==', serviceId);
      forumBlockExistRef.get().then(snapshot => {
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

  public getUserForumBlocks (parentUserId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/forumblocks`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').limit(numberOfItems+1)).valueChanges();
    else 
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').startAt(key).limit(numberOfItems+1)).valueChanges();
  }
}