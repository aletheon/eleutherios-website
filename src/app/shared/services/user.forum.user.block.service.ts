import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserForumUserBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public userIsBlocked(parentUserId: string, serviceId: string, userId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const forumUserBlockRef = this.afs.collection(`users/${parentUserId}/forumuserblocks`).ref.where('serviceId', '==', serviceId).where('userId', '==', userId);
      forumUserBlockRef.get().then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create(parentUserId: string, serviceId: string, userId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/forumuserblocks`).where("serviceId", "==", serviceId).where("userId", "==", userId)
        .get().then(querySnapshot => {
          if (querySnapshot.size == 0){
            const forumUserBlockRef = this.afs.collection(`users/${parentUserId}/forumuserblocks`).doc(this.afs.createId());
            data.forumUserBlockId = forumUserBlockRef.ref.id;
            forumUserBlockRef.set(data).then(() => {
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

  public update(parentUserId: string, serviceId: string, userId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const forumUserBlockRef = this.afs.firestore.collection(`users/${parentUserId}/forumuserblocks`).where("serviceId", "==", serviceId).where("userId", "==", userId);
      data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();

      forumUserBlockRef.get().then(querySnapshot => {
        if (querySnapshot.size == 0){
          let doc = querySnapshot.docs[0];
          doc.ref.update(data).then(() => {
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

  public delete(parentUserId: string, serviceId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const forumUserBlockRef = this.afs.firestore.collection(`users/${parentUserId}/forumuserblocks`).where("serviceId", "==", serviceId).where("userId", "==", userId);
      forumUserBlockRef.get().then(querySnapshot => {
        if (querySnapshot.size > 0){
          let doc = querySnapshot.docs[0];
          doc.ref.delete().then(() => {
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

  public getForumUserBlocks(parentUserId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/forumuserblocks`;

    if (!key){
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
    }
    else {
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
    }
  }
}
