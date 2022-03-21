import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';
import { SearchService } from './search.service';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UserServiceService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase,
    private searchService: SearchService) { }

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
            resolve(null);
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

  public getServicesSearchTerm (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string, currency?: string, startAmount?: number, endAmount?: number): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    // record search
    let data = {
      userId: parentUserId,
      type: 'user.service',
      key: key ? key : '',
      tags: tags,
      includeTagsInSearch: includeTagsInSearch,
      filterTitle: filterTitle,
      paymentType: paymentType,
      currency: currency,
      startAmount: startAmount,
      endAmount: endAmount,
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
    };
    this.searchService.create(data);

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
      if (paymentType){
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
        // return both Payment and Free services
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
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(key.toLowerCase()).endAt(key.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(key.toLowerCase()).endAt(key.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
      else {
        // return both Payment and Free services
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
  }

  public getServices (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string, currency?: string, startAmount?: number, endAmount?: number): Observable<any[]> {
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
      if (paymentType){
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
        // return both Payment and Free services
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
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
      else {
        // return both Payment and Free services
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

  public getAllServices (parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string, currency?: string, startAmount?: number, endAmount?: number): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    // record search
    let data = {
      userId: parentUserId,
      type: 'user.service',
      key: key ? key : '',
      tags: tags,
      includeTagsInSearch: includeTagsInSearch,
      filterTitle: filterTitle,
      paymentType: paymentType,
      currency: currency,
      startAmount: startAmount,
      endAmount: endAmount,
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
    };
    this.searchService.create(data);

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
      if (paymentType){
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
        // return both Payment and Free services
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
        if (paymentType == 'Payment'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).where('paymentType', '==', 'Payment').limit(numberOfItems+1));
          let tempObservable = tempCollection.valueChanges().pipe(
            map(arr => {
              return arr.filter(service => {
                if (tempFilterTitle == true){
                  // check service has a title
                  if (service.title.length > 0){
                    // check service amount is within range
                    if (startAmount && endAmount){
                      if (service.amount >= startAmount && service.amount <= endAmount){
                        if (currency){
                          if (service.currency == currency.toLowerCase())
                            return true;
                          else
                            return false;
                        }
                        else return true;
                      }
                      else return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else {
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
              }).map(service => {
                return { ...service };
              });
            })
          );
          return tempObservable;
        }
        else if (paymentType == 'Free'){
          let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate','desc').startAt(key).where('paymentType', '==', 'Free').limit(numberOfItems+1));
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
          // return both Payment and Free services
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
      else {
        // return both Payment and Free services
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

  public search (parentUserId: string, searchTerm: any, tags?: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string, currency?: string, startAmount?: number, endAmount?: number): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    // record search
    let data = {
      userId: parentUserId,
      type: 'user.service',
      key: newSearchTerm,
      tags: tags,
      includeTagsInSearch: includeTagsInSearch,
      filterTitle: filterTitle,
      paymentType: paymentType,
      currency: currency,
      startAmount: startAmount,
      endAmount: endAmount,
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
    };
    this.searchService.create(data);

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (paymentType){
      if (paymentType == 'Payment'){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Payment'));
        let tempObservable = tempCollection.valueChanges().pipe(
          map(arr => {
            return arr.filter(service => {
              if (tempFilterTitle == true){
                // check service has a title
                if (service.title.length > 0){
                  // check service amount is within range
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
                else return false;
              }
              else {
                if (startAmount && endAmount){
                  if (service.amount >= startAmount && service.amount <= endAmount){
                    if (currency){
                      if (service.currency == currency.toLowerCase())
                        return true;
                      else
                        return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else return true;
              }
            }).map(service => {
              return { ...service };
            });
          })
        );
        return tempObservable;
      }
      else if (paymentType == 'Free'){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Free'));
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
        // return both Payment and Free services
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
    else {
      // return both Payment and Free services
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

  public tagSearch (parentUserId: string, searchTerm: any, tags: string[], includeTagsInSearch?: boolean, filterTitle?: boolean, paymentType?: string, currency?: string, startAmount?: number, endAmount?: number): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/services`;
    let newSearchTerm: string = '';
    let tempFilterTitle: boolean = (filterTitle && filterTitle == true) ? true : false;

    if (typeof searchTerm === "string")
      newSearchTerm = searchTerm;
    else if (searchTerm != null)
      newSearchTerm = searchTerm.title;

    // record search
    let data = {
      userId: parentUserId,
      type: 'user.service',
      key: newSearchTerm,
      tags: tags,
      includeTagsInSearch: includeTagsInSearch,
      filterTitle: filterTitle,
      paymentType: paymentType,
      currency: currency,
      startAmount: startAmount,
      endAmount: endAmount,
      creationDate: firebase.firestore.FieldValue.serverTimestamp()
    };
    this.searchService.create(data);

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();
          collectionName = `users/${parentUserId}/servicescollection/${tags.toString().replace(/,/gi,'')}/services`;
        }
      }
      else collectionName = `users/${parentUserId}/servicesnotags`;
    }

    if (paymentType){
      if (paymentType == 'Payment'){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Payment'));
        let tempObservable = tempCollection.valueChanges().pipe(
          map(arr => {
            return arr.filter(service => {
              if (tempFilterTitle == true){
                // check service has a title
                if (service.title.length > 0){
                  // check service amount is within range
                  if (startAmount && endAmount){
                    if (service.amount >= startAmount && service.amount <= endAmount){
                      if (currency){
                        if (service.currency == currency.toLowerCase())
                          return true;
                        else
                          return false;
                      }
                      else return true;
                    }
                    else return false;
                  }
                  else return true;
                }
                else return false;
              }
              else {
                if (startAmount && endAmount){
                  if (service.amount >= startAmount && service.amount <= endAmount){
                    if (currency){
                      if (service.currency == currency.toLowerCase())
                        return true;
                      else
                        return false;
                    }
                    else return true;
                  }
                  else return false;
                }
                else return true;
              }
            }).map(service => {
              return { ...service };
            });
          })
        );
        return tempObservable;
      }
      else if (paymentType == 'Free'){
        let tempCollection = this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(newSearchTerm.toLowerCase()).endAt(newSearchTerm.toLowerCase()+"\uf8ff").where('paymentType', '==', 'Free'));
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
        // return both Payment and Free services
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
    else {
      // return both Payment and Free services
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
}
