import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import { Observable } from 'rxjs';

@Injectable()
export class TagService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists(tag: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const tagRef = this.afs.collection('tags').ref.where('tag', '==', tag);

      tagRef.get().then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getTag(tagId: string): Observable<any> {
    return this.afs.collection('tags').doc(tagId).valueChanges();
  }

  public create(tagId: string, data: any) {
    return new Promise((resolve, reject) => {
      const tagRef = this.afs.collection('tags').doc(tagId);

      tagRef.set(data).then(() => {
        resolve();          
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public delete(tagId: string) {
    return new Promise((resolve, reject) => {
      const tagRef = this.afs.collection('tags').doc(tagId);

      tagRef.delete().then(() => {
        resolve();        
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public search(searchTerm: any): Observable<any[]> {
    let newSearchTerm: string = '';
      
    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.tag;

    return this.afs.collection<any>('tags', ref => ref.orderBy('tag').startAt(newSearchTerm).endAt(newSearchTerm+"\uf8ff")).valueChanges();
  }
}