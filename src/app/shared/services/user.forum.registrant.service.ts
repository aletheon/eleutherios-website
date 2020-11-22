import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class UserForumRegistrantService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getRegistrantFromPromise(parentUserId: string, forumId: string, serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref
        .where('serviceId', '==', serviceId);

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0)
            resolve(snapshot.docs[0].data());
          else
            resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getDefaultUserRegistrantFromPromise(parentUserId: string, forumId: string, userId: string): Promise<any>{
    return new Promise((resolve, reject) => {
      let query = this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref
        .where('uid', '==', userId)
        .where('default', '==', true);

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0)
            resolve(snapshot.docs[0].data());
          else
            resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }
  
  public getDefaultUserRegistrant(parentUserId: string, forumId: string, userId: string): Observable<any[]>{
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`, (ref) => ref.where('uid', '==', userId).where('default', '==', true).limit(1)).valueChanges();
  }

  public serviceIsServingInForumFromPromise(parentUserId: string, forumId: string, serviceId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const registrantRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref.where('serviceId', '==', serviceId);
      registrantRef.get().then(querySnapshot => {
        if (querySnapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      }).catch(error => {
        reject(error);
      });
    });
  }

  public serviceIsServingInForum(parentUserId: string, forumId: string, serviceId: string): Observable<boolean>{
    return this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`, (ref) => ref.where('serviceId', '==', serviceId).limit(1)).valueChanges().pipe(
      switchMap(registrants => {
        if (registrants.length > 0)
          return of(true);
        else
          return of(false);
      })
    );
  }

  public exists(parentUserId: string, forumId: string, serviceId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref
        .where('serviceId', '==', serviceId)
        .get()
        .then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create(parentUserId: string, forumId: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const registrantRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).doc(this.afs.createId());
      data.registrantId = registrantRef.ref.id;
      registrantRef.set(data).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public update(parentUserId: string, forumId: string, registrantId: string, data: any){
    const registrantRef = this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).doc(registrantId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return registrantRef.update(data);
  }

  public delete(parentUserId: string, forumId: string, serviceId: string){
    return new Promise((resolve, reject) => {
      this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref.where('serviceId', '==', serviceId).get().then(registrantSnapshot => {
        if (registrantSnapshot.size > 0){
          let registrantDoc = registrantSnapshot.docs[0];
          let registrant = registrantSnapshot.docs[0].data();

          // check if user has another service serving in this forum
          // and set it as the default before removing this one
          if (registrant.default == true){
            this.afs.collection(`users/${parentUserId}/forums/${forumId}/registrants`).ref.orderBy('creationDate', 'desc').where('uid', '==', registrant.uid).where('default', '==', false).get().then(newDefaultRegistrantSnapshot => {
              if (newDefaultRegistrantSnapshot.size > 0){
                let newDefaultRegistrantDoc = newDefaultRegistrantSnapshot.docs[0];
                let newDefaultRegistrant = newDefaultRegistrantSnapshot.docs[0].data();

                newDefaultRegistrant.default = true;
                newDefaultRegistrantDoc.ref.update(newDefaultRegistrant).then(() => {
                  registrantDoc.ref.delete().then(() => {
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
                registrantDoc.ref.delete().then(() => {
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
          }
          else {
            registrantDoc.ref.delete().then(() => {
              resolve();
            })
            .catch(error => {
              reject(error);
            });
          }
        }
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getRegistrants(parentUserId: string, forumId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/registrants`, ref => ref.where('indexed', '==', true).orderBy('creationDate', 'desc')).valueChanges();
  }

  public searchRegistrants(parentUserId: string, forumId: string, numberOfItems: number, key?: any): Observable<any[]>{
    if (!key)
      return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/registrants`, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1)).valueChanges();
    else
      return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/registrants`, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1)).valueChanges();
  }

  public getUserRegistrants(parentUserId: string, forumId: string, userId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/registrants`, ref => ref.orderBy('default','desc').where('uid', '==', userId)).valueChanges();
  }
}