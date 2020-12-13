import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AnonymousServiceService {
  constructor(private afs: AngularFirestore) { }

  public exists(serviceId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const serviceRef = this.afs.collection('anonymousservices').doc(serviceId);

      serviceRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getServiceFromPromise(serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.collection('anonymousservices').doc(serviceId).ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          reject(`Service with serviceId ${serviceId} was not found`);
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getService(serviceId: string): Observable<any> {
    if (serviceId && serviceId.length > 0)
      return this.afs.collection<any>('anonymousservices').doc(serviceId).valueChanges();
    else
      return of(null);
  }

  public getServices (numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'anonymousservices';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `anonymousservicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'anonymousservicesnotags';
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