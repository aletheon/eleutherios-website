import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SearchService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  public create (data: any) {
    const searchRef = this.afs.collection('searches').doc(this.afs.createId());
    data.searchId = searchRef.ref.id;
    return searchRef.set(data);
  }

  public update (searchId: string, data: any) {
    const searchRef = this.afs.collection('searches').doc(searchId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return searchRef.update(data);
  }

  public delete (searchId: string) {
    const searchRef = this.afs.collection('searches').doc(searchId);
    return searchRef.delete();
  }
}
