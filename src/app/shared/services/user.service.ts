import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Http, Headers } from '@angular/http';
import { User } from '../models/user.model';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';
import 'rxjs/add/operator/toPromise';

@Injectable()
export class UserService {
  constructor(private afs: AngularFirestore, private fun: AngularFireFunctions, private http: Http ) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const userRef = this.afs.collection('users').doc(parentUserId);

      userRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public create (parentUserId: string, data: any) {
    return new Promise((resolve, reject) => {
      const userRef = this.afs.doc(`users/${parentUserId}`);

      userRef.set(data).then(() => {
        setTimeout(() => { // dalay for user to be created on the server
          resolve();
        }, 2500);
      })
      .catch(error => { 
        reject(error);
      });
    });
  }

  public update (parentUserId: string, data: any) {
    return new Promise((resolve, reject) => {
      this.afs.collection('users').doc(parentUserId).ref.get().then(doc => {
        if (doc.exists){
          data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
          doc.ref.update(data).then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        }
        else reject('User with userId ' + parentUserId + ' not found');
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public delete (parentUserId: string) {
    return new Promise((resolve, reject) => {
      const userRef = this.afs.doc(`users/${parentUserId}`);
      userRef.delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public onboardCustomer (parentUserId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = 'https://us-central1-eleutherios-website.cloudfunctions.net/onboardStripeUser';

      firebase.auth().currentUser.getIdToken()
        .then(authToken => {
          const headers = new Headers({'Authorization': 'Bearer ' + authToken });
          const myUID    = { uid: parentUserId };    // success 200 response
          const notMyUID = { uid: 'testabce123456' }; // error 403 response

          return this.http.post(url, myUID, { headers: headers }).toPromise()
        })
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  public getUserFromPromise (parentUserId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.doc<User>(`users/${parentUserId}`).ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getUser (parentUserId: string): Observable<any> {
    return this.afs.doc<User>(`users/${parentUserId}`).valueChanges();
  }
}