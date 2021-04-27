import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserForumForumService {
  constructor(private afs: AngularFirestore) { }
  // *********************************************************************
  // public methods
  // *********************************************************************
  public forumIsServingInForum (parentUserId: string, parentForumId: string, forumId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const forumForumRef = this.afs.collection(`users/${parentUserId}/forums/${parentForumId}/forums`).ref.where('forumId', '==', forumId);

      forumForumRef.get().then(querySnapshot => {
        if (querySnapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create (parentUserId: string, parentForumId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const forumForumRef = this.afs.collection(`users/${parentUserId}/forums/${parentForumId}/forums`).doc(data.forumId);
      forumForumRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public delete (parentUserId: string, parentForumId: string, forumId: string): Promise<void>{
    return new Promise((resolve, reject) => {
      this.afs.collection(`users/${parentUserId}/forums/${parentForumId}/forums`).ref.where('forumId', '==', forumId).get().then(snapshot => {
        if (snapshot.size > 0){
          let promises = snapshot.docs.map(doc => {
            return new Promise<void>((resolve, reject) => {
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
        else reject(`ForumForum with forumId ${forumId} was not found`);
      });
    });
  }

  public getForumForums (parentUserId: string, parentForumId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${parentForumId}/forums`, ref => ref.orderBy('creationDate')).valueChanges();
  }

  public removeForumForums (parentUserId: string, parentForumId: string): Promise<void>{
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/forums/${parentForumId}/forums`)
        .get().then(querySnapshot => {
          if (querySnapshot.size > 0){
            let promises = querySnapshot.docs.map(doc => {
              return new Promise<void>((resolve, reject) => {
                doc.ref.delete().then(() => {
                  resolve();
                }).catch(error => {
                  reject(error);
                });
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
        }
      );
    });
  }

  public removeForumFromParent (parentUserId: string, parentForumId: string, forumId: string): Promise<void>{
    return new Promise((resolve, reject) => {
      this.delete(parentUserId, parentForumId, forumId).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}
