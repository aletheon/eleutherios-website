import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserForumImageService {
  constructor (private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, forumId: string, imageId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const forumImageRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/images`).doc(imageId);

      forumImageRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create (parentUserId: string, forumId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const userForumImageRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/images`).doc(data.imageId);
      data.creationDate = firebase.firestore.FieldValue.serverTimestamp();
      userForumImageRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update (parentUserId: string, forumId: string, imageId: string, data: any) {
    const userForumImageRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/images`).doc(imageId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return userForumImageRef.update(data);
  }

  public delete (parentUserId: string, forumId: string, imageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const userForumImageRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/images`).doc(imageId);
      userForumImageRef.ref.get().then(doc => {
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

  public getDefaultForumImages (parentUserId: string, forumId: string): Observable<any> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/images`, ref => ref.where('default', '==', true).limit(1)).valueChanges();
  }

  public getForumImage (parentUserId: string, forumId: string, imageId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/images`).doc(imageId).valueChanges();
  }

  public getForumImages (parentUserId: string, forumId: string, numberOfItems: number, key?: any): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums/${forumId}/images`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').limit(numberOfItems+1)).valueChanges();
    else
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').startAt(key).limit(numberOfItems+1)).valueChanges();
  }

  public removeForumImages (parentUserId: string, forumId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/forums/${forumId}/images`).get().then(snapshot => {
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
