import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserForumServiceBlockService {
  constructor(private afs: AngularFirestore) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public serviceIsBlocked(parentUserId: string, forumId: string, serviceId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      this.afs.firestore.collection(`users/${parentUserId}/forums/${forumId}/serviceblocks`).where("serviceId", "==", serviceId)
        .get().then(querySnapshot => {
          if (querySnapshot.size > 0)
            resolve(true);
          else
            resolve(false);
        }
      );
    });
  }

  public getUserForumServiceBlocks(parentUserId: string, forumId: string, numberOfItems: number, key?: any): Observable<any[]>{
    let collectionName: string = `users/${parentUserId}/forums/${forumId}/serviceblocks`;

    if (!key)
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').limit(numberOfItems+1)).valueChanges();
    else 
      return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate').startAt(key).limit(numberOfItems+1)).valueChanges();
  }
}