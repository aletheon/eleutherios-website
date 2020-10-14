import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AnonymousForumService {
  constructor(private afs: AngularFirestore) { }

  public exists(forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const forumRef = this.afs.collection('anonymousforums').doc(forumId);

      forumRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getForumFromPromise(forumId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.collection('anonymousforums').doc(forumId).ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getForum(forumId: string): Observable<any> {
    if (forumId && forumId.length > 0)
      return this.afs.collection<any>('anonymousforums').doc(forumId).valueChanges();
    else
      return of(null);
  }

  public getForums (numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'anonymousforums';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `anonymousforumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'anonymousforumsnotags';
    }

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(forum => {
            if (tempFilterTitle == true){
              if (forum.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(forum => {
            return { ...forum };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(forum => {
            if (tempFilterTitle == true){
              if (forum.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(forum => {
            return { ...forum };
          });
        })
      );
      return tempObservable;
    }
  }
}