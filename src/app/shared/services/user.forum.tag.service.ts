import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserForumTagService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getTagCount(parentUserId: string, forumId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const forumTagRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/tags`);

      forumTagRef.ref.get().then(querySnapshot => {
        resolve(querySnapshot.size);
      });
    });
  }

  public exists(parentUserId: string, forumId: string, tagId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/tags`).doc(tagId);

      tagRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getTag(parentUserId: string, forumId: string, tagId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/tags`).doc(tagId).valueChanges();
  }

  public create(parentUserId: string, forumId: string, data: any) {
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/tags`).doc(data.tagId).set(data);
  }

  public delete(parentUserId: string, forumId: string, tagId: string){
    const tagRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/tags`).doc(tagId);

    return tagRef.ref.get().then(doc => {
      if (doc.exists)
        return doc.ref.delete();
      else
        return Promise.resolve();
    });
  }

  public getTags(parentUserId: string, forumId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/tags`, ref => ref.orderBy('tag')).valueChanges();
  }

  public removeForumTags(parentUserId: string, forumId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/forums/${forumId}/tags`).get().then(snapshot => {
        if (snapshot.size > 0){
          let promises = snapshot.docs.map(doc => {
            return new Promise<void>((resolve, reject) => {
              if (doc.exists){
                doc.ref.delete().then(() => {
                  resolve();
                }).catch(error => {
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