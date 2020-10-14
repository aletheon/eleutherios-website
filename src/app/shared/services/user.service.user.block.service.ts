import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserServiceUserBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public userIsBlocked(parentUserId: string, forumId: string, userId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const serviceUserBlockRef = this.afs.collection(`users/${parentUserId}/serviceuserblocks`).ref.where('forumId', '==', forumId).where('userId', '==', userId);
      serviceUserBlockRef.get().then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create(parentUserId: string, forumId: string, userId: string, data: any){
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/serviceuserblocks`).where("forumId", "==", forumId).where("userId", "==", userId)
        .get().then(querySnapshot => {
          if (querySnapshot.size == 0){
            const serviceUserBlockRef = this.afs.collection(`users/${parentUserId}/serviceuserblocks`).doc(this.afs.createId());
            data.serviceUserBlockId = serviceUserBlockRef.ref.id;
            serviceUserBlockRef.set(data).then(() => {
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

  public update(parentUserId: string, forumId: string, userId: string, data: any){
    return new Promise((resolve, reject) => {
      const serviceUserBlockRef = this.afs.firestore.collection(`users/${parentUserId}/serviceuserblocks`).where("forumId", "==", forumId).where("userId", "==", userId);
      data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();

      serviceUserBlockRef.get().then(querySnapshot => {
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

  public delete(parentUserId: string, forumId: string, userId: string){
    return new Promise((resolve, reject) => {
      const serviceUserBlockRef = this.afs.firestore.collection(`users/${parentUserId}/serviceuserblocks`).where("forumId", "==", forumId).where("userId", "==", userId);
      serviceUserBlockRef.get().then(querySnapshot => {
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

  public getServiceUserBlocks(parentUserId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/serviceuserblocks`;

    if (!key){
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
    }
    else {
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
    }
  }
}