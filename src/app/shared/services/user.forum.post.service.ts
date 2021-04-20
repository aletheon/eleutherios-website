import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserForumPostService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getPost (parentUserId: string, forumId: string, postId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/posts`).doc(postId).valueChanges();
  }

  public getPostFromPromise (parentUserId: string, forumId: string, postId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const postRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/posts`).doc(postId);

      postRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve(null);
      });
    });
  }

  public create(parentUserId: string, forumId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const postRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/posts`).doc(data.postId);
      postRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update(parentUserId: string, forumId: string, postId: string, data: any){
    const postRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/posts`).doc(postId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return postRef.update(data);
  }

  public delete(parentUserId: string, forumId: string, postId: string) {
    const postRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/posts`).doc(postId);
    return postRef.delete();
  }

  public getLastPosts(parentUserId: string, forumId: string, limit: number): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/posts`, ref => ref.orderBy('creationDate','desc').limit(limit)).valueChanges();
  }

  public getPosts(parentUserId: string, forumId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/posts`, ref => ref.orderBy('creationDate','desc').limit(12)).valueChanges();
  }
}
