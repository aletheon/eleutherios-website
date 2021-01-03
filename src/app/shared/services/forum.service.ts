import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ForumService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  public exists (forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const forumRef = this.afs.collection('forums').doc(forumId);

      forumRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getForumFromPromise (forumId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const forumRef = this.afs.collection('forums').doc(forumId);

      forumRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve(null);
      });
    });
  }

  public getForum (forumId: string): Observable<any> {
    return this.afs.collection('forums').doc(forumId).valueChanges();
  }

  public getForumsSearchTerm (numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'forums';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'forumsnotags';
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
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(key.toLowerCase()).endAt(key.toLowerCase()+"\uf8ff").limit(numberOfItems+1));
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

  public getForums (numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'forums';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'forumsnotags';
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

  public getAllForums (numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'forums';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'forumsnotags';
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

  public search (searchTerm: any, tags?: string[], excludeForumId?: string, includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'forums';
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'forumsnotags';
    }

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(forum => {
          if (tempFilterTitle == true){
            if (forum.title.length > 0){
              if (excludeForumId !== undefined){
                if (forum.forumId != excludeForumId)
                  return true;
                else
                  return false;
              }
              else return true;
            }
            else return false;
          }
          else {
            if (excludeForumId !== undefined){
              if (forum.forumId != excludeForumId)
                return true;
              else
                return false;
            }
            else return true;
          }
        }).map(forum => {
          return { ...forum };
        });
      })
    );
    return tempObservable;
  }

  public tagSearch (searchTerm: any, tags: string[], excludeForumId?: string, includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'forums';
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = 'forumsnotags';
    }

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(forum => {
          if (tempFilterTitle == true){
            if (forum.title.length > 0){
              if (excludeForumId !== undefined){
                if (forum.forumId != excludeForumId)
                  return true; 
                else
                  return false;
              }
              else return true
            }
            else return false;
          }
          else {
            if (excludeForumId !== undefined){
              if (forum.forumId != excludeForumId)
                return true; 
              else
                return false;
            }
            else return true
          }
        }).map(forum => {
          return { ...forum };
        });
      })
    );
    return tempObservable;
  }
}