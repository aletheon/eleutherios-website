import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserServiceService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, serviceId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const serviceRef = this.afs.collection(`users/${parentUserId}/services`).doc(serviceId);

      serviceRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getServiceFromPromise (parentUserId: string, serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let serviceRef = this.afs.collection(`users/${parentUserId}/services`).doc(serviceId);

      serviceRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            reject(`Service with serviceId ${serviceId} was not found`);
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getService (parentUserId: string, serviceId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/services`).doc(serviceId).valueChanges();
  }

  public create (parentUserId: string, data: any): Observable<any> {
    const serviceRef = this.afs.collection(`users/${parentUserId}/services`).doc(this.afs.createId());
    data.serviceId = serviceRef.ref.id;
    serviceRef.set(data);
    return serviceRef.valueChanges();
  }

  public update (parentUserId: string, serviceId: string, data: any) {
    const serviceRef = this.afs.collection(`users/${parentUserId}/services`).doc(serviceId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return serviceRef.update(data);
  }

  public delete (parentUserId: string, serviceId: string) {
    const serviceRef = this.afs.collection(`users/${parentUserId}/services`).doc(serviceId);
    return serviceRef.delete();
  }

  public getServicesSearchTerm (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(key.toLowerCase()).endAt(key.toLowerCase()+"\uf8ff").limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
  }

  public getServices (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
  }

  public getAllServices (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (!key){
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
    else {
      let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).limit(numberOfItems+1));
      let tempObservable = tempCollection.valueChanges().pipe(
        map(arr => {
          return arr.filter(service => {
            if (tempFilterTitle == true){
              if (service.title.length > 0)
                return true;
              else
                return false;
            }
            else return true;
          }).map(service => {
            return { ...service };
          });
        })
      );
      return tempObservable;
    }
  }

  public search (parentUserId: string, searchTerm: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(service => {
          if (tempFilterTitle == true){
            if (service.title.length > 0)
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

  public tagSearch (parentUserId: string, searchTerm: any, tags: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff"));
    let tempObservable = tempCollection.valueChanges().pipe(
      map(arr => {
        return arr.filter(service => {
          if (tempFilterTitle == true){
            if (service.title.length > 0)
              return true;
            else
              return false;
          }
          else return true;
        }).map(service => {
          return { ...service };
        });
      })
    );
    return tempObservable;
  }
}