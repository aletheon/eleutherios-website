import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ServiceService {
  constructor(private afs: AngularFirestore) { }

  public exists (serviceId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const serviceRef = this.afs.collection('services').doc(serviceId);

      serviceRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getServiceFromPromise (serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const serviceRef = this.afs.collection('services').doc(serviceId);

      serviceRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          reject(`Service with serviceId ${serviceId} was not found`);
      });
    });
  }

  public getService(serviceId: string): Observable<any> {
    return this.afs.collection('services').doc(serviceId).valueChanges();
  }

  public getServicesSearchTerm(numberOfItems: number, key?: string, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'services';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'servicesnotags';
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

  public getServices(numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string): Observable<any[]>{
    let collectionName: string = 'services';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'servicesnotags';
    }

    if (!key){
      if (paymentType){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', paymentType).limit(numberOfItems+1));
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
    }
    else {
      if (paymentType){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).where('paymentType', '==', paymentType).limit(numberOfItems+1));
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
  }

  public getAllServices(numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'services';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'servicesnotags';
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

  public search(searchTerm: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'services';
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'servicesnotags';
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

  public tagSearch(searchTerm: any, tags: string[], includeTagsInSearch?: boolean, filterTitle?: boolean): Observable<any[]>{
    let collectionName: string = 'services';
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = 'servicesnotags';
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