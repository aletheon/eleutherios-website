import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserForumPostService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  documentToDomainObject = _ => {
    const object = _.payload.val();
    object.postId = _.key;
    return object;
  }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public create(parentUserId: string, forumId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let posts = this.db.list(`users/${parentUserId}/forums/${forumId}/posts`);

      posts.push(data)
        .then(snap => {
          resolve();
        }
      );
    });
  }

  public update(parentUserId: string, forumId: string, postId: string, data: any){
    let postRef = this.db.object(`users/${parentUserId}/forums/${forumId}/posts/${postId}`);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return postRef.update(data);
  }

  public delete(parentUserId: string, forumId: string, postId: string): Promise<void>{
    return new Promise((resolve, reject) => {
      this.db.database.ref(`users/${parentUserId}/forums/${forumId}/posts/${postId}`).once('value').then(snapshot => {
        if (snapshot.exists){
          let post = snapshot.val();

          // remove the post
          snapshot.ref.remove().then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else reject(`Post with postId ${postId} does not exist or was removed`);
      });
    });
  }

  public getLastPosts(parentUserId: string, forumId: string, limit: number): Observable<any[]> {
    return this.db.list(`users/${parentUserId}/forums/${forumId}/posts`, ref => ref.orderByKey().limitToLast(limit)).snapshotChanges()
      .pipe(map(actions => actions.map(this.documentToDomainObject)));
  }

  public getPosts(parentUserId: string, forumId: string): Observable<any[]> {
    return this.db.list(`users/${parentUserId}/forums/${forumId}/posts`, ref => ref.limitToLast(12)).snapshotChanges()
      .pipe(map(actions => actions.map(this.documentToDomainObject)));
  }
}