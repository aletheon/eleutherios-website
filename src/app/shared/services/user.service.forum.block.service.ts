import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceForumBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public forumIsBlocked(parentUserId: string, serviceId: string, forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/forumblocks`).where("forumId", "==", forumId)
        .get().then(querySnapshot => {
          if (querySnapshot.size > 0)
            resolve(true);
          else
            resolve(false);
        }
      );
    });
  }

  public create(parentUserId: string, serviceId: string, forumId: string, data: any) {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/forumblocks`).where("forumId", "==", forumId)
        .get().then(querySnapshot => {
          if (querySnapshot.size == 0){
            const serviceForumBlockRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/forumblocks`).doc(this.afs.createId());
            data.forumBlockId = serviceForumBlockRef.ref.id;
            serviceForumBlockRef.set(data).then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
          else resolve();
        }
      );
    });
  }

  public update(parentUserId: string, serviceId: string, forumBlockId: string, data: any){
    const serviceForumBlockRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/forumblocks`).doc(forumBlockId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return serviceForumBlockRef.update(data);
  }

  public delete(parentUserId: string, serviceId: string, forumId: string){
    return new Promise((resolve, reject) => {
      const serviceForumBlockRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/forumblocks`).ref.where('forumId', '==', forumId);
      serviceForumBlockRef.get().then(snapshot => {
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

  public getUserServiceForumBlocks(parentUserId: string, serviceId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/services/${serviceId}/forumblocks`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').limit(numberOfItems+1)).valueChanges();
    else 
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').startAt(key).limit(numberOfItems+1)).valueChanges();
  }
}