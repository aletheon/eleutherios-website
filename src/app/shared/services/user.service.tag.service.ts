import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserServiceTagService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public getTagCount(parentUserId: string, serviceId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const serviceTagRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/tags`);

      serviceTagRef.ref.get().then(querySnapshot => {
        resolve(querySnapshot.size);
      });
    });
  }

  public exists(parentUserId: string, serviceId: string, tagId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const tagRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/tags`).ref.where('tagId', '==', tagId);

      tagRef.get().then(snapshot => {
        if (snapshot.size > 0)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getTag(parentUserId: string, serviceId: string, tagId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services/${serviceId}/tags`).doc(tagId).valueChanges();
  }

  public create(parentUserId: string, serviceId: string, data: any){
    return this.afs.collection(`users/${parentUserId}/services/${serviceId}/tags`).doc(data.tagId).set(data);
  }

  public delete(parentUserId: string, serviceId: string, tagId: string){
    const tagRef = this.afs.collection(`users/${parentUserId}/services/${serviceId}/tags`).doc(tagId);

    return tagRef.ref.get().then(doc => {
      if (doc.exists)
        return doc.ref.delete();
      else
        return Promise.resolve();
    });
  }

  public getTags(parentUserId: string, serviceId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/services/${serviceId}/tags`, ref => ref.orderBy('tag', 'asc')).valueChanges();
  }
  
  public removeServiceTags(parentUserId: string, serviceId: string) {
    return new Promise((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/services/${serviceId}/tags`).get().then(snapshot => {
        if (snapshot.size > 0){
          let promises = snapshot.docs.map(doc => {
            return new Promise((resolve, reject) => {
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
        else resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }
}