import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserNotificationTagService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getTagCount(parentUserId: string, notificationId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const notificationTagRef = this.afs.collection(`users/${parentUserId}/notifications/${notificationId}/tags`);

      notificationTagRef.ref.get().then(querySnapshot => {
        resolve(querySnapshot.size);
      });
    });
  }

  public exists(parentUserId: string, notificationId: string, tagId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/notifications/${notificationId}/tags`).ref.where('tagId', '==', tagId);

      tagRef.get().then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getTag(parentUserId: string, notificationId: string, tagId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/notifications/${notificationId}/tags`).doc(tagId).valueChanges();
  }

  public create(parentUserId: string, notificationId: string, data: any){
    return this.afs.collection(`users/${parentUserId}/notifications/${notificationId}/tags`).doc(data.tagId).set(data);
  }

  public delete(parentUserId: string, notificationId: string, tagId: string){
    const tagRef = this.afs.collection(`users/${parentUserId}/notifications/${notificationId}/tags`).doc(tagId);

    return tagRef.ref.get().then(doc => {
      if (doc.exists)
        return doc.ref.delete();
      else
        return Promise.resolve();
    });
  }

  public getTags(parentUserId: string, notificationId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/notifications/${notificationId}/tags`, ref => ref.orderBy('tag', 'asc')).valueChanges();
  }
  
  public removeNotificationTags(parentUserId: string, notificationId: string) {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/notifications/${notificationId}/tags`).get().then(snapshot => {
        if (snapshot.size > 0){
          let promises = snapshot.docs.map(doc => {
            return new Promise((resolve, reject) => {
              if (doc.exists){
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

          Promise.all(promises).then(() => {
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