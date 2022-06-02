import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserForumService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  public exists (parentUserId: string, forumId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const forumRef = this.afs.collection(`users/${parentUserId}/forums`).doc(forumId);

      forumRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getForumFromPromise (parentUserId: string, forumId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const forumRef = this.afs.collection(`users/${parentUserId}/forums`).doc(forumId);

      forumRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve(null);
      });
    });
  }

  public getForum (parentUserId: string, forumId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/forums`).doc(forumId).valueChanges();
  }

  public create (parentUserId: string, data: any): Observable<any> {
    const forumRef = this.afs.collection(`users/${parentUserId}/forums`).doc(this.afs.createId());
    data.forumId = forumRef.ref.id;
    forumRef.set(data);
    return forumRef.valueChanges();
  }

  public update (parentUserId: string, forumId: string, data: any) {
    const forumRef = this.afs.collection(`users/${parentUserId}/forums`).doc(forumId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return forumRef.update(data);
  }

  public delete (parentUserId: string, forumId: string) {
    const forumRef = this.afs.collection(`users/${parentUserId}/forums`).doc(forumId);
    return forumRef.delete();
  }

  public serviceIsServingInUserForumFromPromise (parentUserId: string, serviceId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const that = this;
      const forumRef = this.afs.collection(`users/${parentUserId}/forums`);

      forumRef.ref.get().then(querySnapshot => {
        if (querySnapshot.size > 0){
          let forumsServingIn: any[] = [];

          // iterate forums and store/remember forums in which the service is serving in
          let promises = querySnapshot.docs.map(doc => {
            return new Promise<void>((resolve, reject) => {
              let forum = doc.data();

              let serviceIsServingInForum = function () {
                return new Promise<void>((resolve, reject) => {
                  const registrantRef = that.afs.collection(`users/${forum.uid}/forums/${forum.forumId}/registrants`).ref.where('serviceId', '==', serviceId);

                  registrantRef.get().then(querySnapshot => {
                    if (querySnapshot.size > 0)
                      forumsServingIn.push(forum);

                    resolve();
                  });
                });
              };

              serviceIsServingInForum().then(() => {
                resolve();
              })
              .catch(error => {
                reject(error);
              });
            });
          });

          Promise.all(promises).then(() => {
            if (forumsServingIn.length > 0)
              resolve(true);
            else
              resolve(false);
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve(false);
      });
    });
  }

  public getForumsSearchTerm (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = `users/${parentUserId}/forumsnotags`;
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

  public getForums (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = `users/${parentUserId}/forumsnotags`;
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

  public getAllForums (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = `users/${parentUserId}/forumsnotags`;
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

  public search (parentUserId: string, searchTerm: any, tags?: string[], excludeForumId?: string, includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = `users/${parentUserId}/forumsnotags`;
    }

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(forum => {
          if (excludeForumId !== undefined){
            if (forum.forumId != excludeForumId){
              // make sure it doesn't belong to a forum already
              if (forum.parentId.length == 0){
                if (tempFilterTitle == true){
                  if (forum.title.length > 0)
                    return true;
                  else
                    return false;
                }
                else return true;
              }
              else return false;
            }
            else return false;
          }
          else {
            // make sure it doesn't belong to a forum already
            if (forum.parentId.length == 0){
              if (tempFilterTitle == true){
                if (forum.title.length > 0)
                  return true;
                else
                  return false;
              }
              else return true;
            }
            else return false;
          }
        }).map(forum => {
          return { ...forum };
        });
      })
    );
    return tempObservable;
  }

  public tagSearch(parentUserId: string, searchTerm: any, tags: string[], excludeForumId?: string, includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/forums`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/forumscollection/${tags.toString().replace(/,/gi,'')}/forums`;
        }
      }
      else collectionName = `users/${parentUserId}/forumsnotags`;
    }

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(forum => {
          if (excludeForumId !== undefined){
            if (forum.forumId != excludeForumId){
              // make sure it doesn't belong to a forum already
              if (forum.parentId.length == 0){
                if (tempFilterTitle == true){
                  if (forum.title.length > 0)
                    return true;
                  else
                    return false;
                }
                else return true;
              }
              else return false;
            }
            else return false;
          }
          else {
            // make sure it doesn't belong to a forum already
            if (forum.parentId.length == 0){
              if (tempFilterTitle == true){
                if (forum.title.length > 0)
                  return true;
                else
                  return false;
              }
              else return true;
            }
            else return false;
          }
        }).map(forum => {
          return { ...forum };
        });
      })
    );
    return tempObservable;
  }
}
