import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserActivityService {
  constructor(private afs: AngularFirestore) { }

  public removeRegistrants (forumUid: string, forumId: string, userId: string){
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${userId}/activities/${forumId}/registrants`).get().then(querySnapshot => {
        if (querySnapshot.size > 0){
          var promises = querySnapshot.docs.map(docActivityRegistrant => {
            return new Promise((resolve, reject) => {
              var registrant = docActivityRegistrant.data();

              // remove from forum registrants
              this.afs.firestore.collection(`users/${forumUid}/forums/${forumId}/registrants`).doc(registrant.registrantId).get().then(docRegistrant => {
                if (docRegistrant.exists){
                  docRegistrant.ref.delete().then(() => {
                    docActivityRegistrant.ref.delete().then(() => {
                      resolve();
                    })
                    .catch(error => {
                      reject(error);
                    });
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
                else {
                  // delete the activity
                  docActivityRegistrant.ref.delete().then(() => {
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                }
              })
              .catch(error => {
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
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getActivity (parentUserId: string, forumId: string){
    return new Promise<any>((resolve, reject) => {
      const activityRef = this.afs.collection(`users/${parentUserId}/activities`).doc(forumId);
      activityRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve();
      });
    });
  }

  public create (parentUserId: string, forumId: string, data: any){
    return new Promise<any>((resolve, reject) => {
      const activityRef = this.afs.collection(`users/${parentUserId}/activities`).doc(forumId);
      activityRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update (parentUserId: string, forumId: string, data: any){
    const activityRef = this.afs.collection(`users/${parentUserId}/activities`).doc(forumId);
    // data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return activityRef.update(data);
  }

  public delete (parentUserId: string, forumId: string) {
    return new Promise<any>((resolve, reject) => {
      const activityRef = this.afs.collection(`users/${parentUserId}/activities`).doc(forumId);
      activityRef.ref.get().then(doc => {
        if (doc.exists){
          let activity = doc.data();

          this.removeRegistrants(activity.uid, forumId, parentUserId).then(() => {
            activityRef.delete().then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  }

  public removeRegistrant (parentUserId: string, forumId: string, data: any){
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/activities/${forumId}/registrants`).doc(data.registrantId).get().then(doc => {
        if (doc.exists){
          doc.ref.delete().then(() => {
            // remove the activity if there is no more of the end users services (i.e. registrants) serving in the forum
            let registrantActivityRef = this.afs.firestore.collection(`users/${parentUserId}/activities/${forumId}/registrants`);

            registrantActivityRef.get().then(querySnapshot => {
              if (querySnapshot.size == 0){
                let activityRef = this.afs.firestore.collection(`users/${parentUserId}/activities`).doc(forumId);
                activityRef.delete().then(() => {
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
          })
          .catch(error => {
            reject(error);
          });
        }
        else resolve();
      });
    });
  }

  public getActivities (parentUserId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/activities`, ref => ref.orderBy('lastUpdateDate', 'desc')).valueChanges();
  }
}