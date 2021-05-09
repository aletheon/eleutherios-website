import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import * as firebase from 'firebase';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserForumPostIdService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public create (parentUserId: string, forumId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // create new post id
      const postIdRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/postids`).doc(data.postId);
      postIdRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getLastPostIds(parentUserId: string, forumId: string, limit: number): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/postids`, ref => ref.orderBy('creationDate','desc').limit(limit)).valueChanges();
  }
}
