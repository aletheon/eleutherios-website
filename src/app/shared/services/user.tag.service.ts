import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { TagService } from './tag.service';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserTagService {
  constructor(private afs: AngularFirestore,
    private tagService: TagService) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, tagId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/tags`).doc(tagId);

      tagRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getTag (parentUserId: string, tagId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/tags`).doc(tagId).valueChanges();
  }

  public create (parentUserId: string, data: any) {
    return new Promise<any>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/tags`).doc(this.afs.createId());
      data.tagId = tagRef.ref.id;
      tagRef.set(data).then(() => {
        this.tagService.create(data.tagId, data).then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  public update (parentUserId: string, tagId: string, data: any) {
    const tagRef = this.afs.collection(`users/${parentUserId}/tags`).doc(tagId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return tagRef.update(data);
  }

  public delete (parentUserId: string, tagId: string) {
    return new Promise<any>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/tags`).doc(tagId);
      tagRef.delete().then(() => {
        this.tagService.delete(tagId).then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
      })
      .catch((error) => {
        reject(error);
      });
    });
  }

  public getTags (parentUserId: string, numberOfItems: number, key?: any): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/tags`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').limit(numberOfItems+1)).valueChanges();
    else
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').startAt(key).limit(numberOfItems+1)).valueChanges();
  }

  public search (parentUserId: string, searchTerm: any): Observable<any[]> {
    let newSearchTerm: string = '';
      
    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.tag;

    return this.afs.collection<any>(`users/${parentUserId}/tags`, ref => ref.orderBy('tag').startAt(newSearchTerm).endAt(newSearchTerm+"\uf8ff")).valueChanges();
  }
}