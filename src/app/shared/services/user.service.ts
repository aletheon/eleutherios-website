import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';

import * as firebase from 'firebase/app';
import { Observable, from } from 'rxjs';

@Injectable()
export class UserService {
  constructor(private afs: AngularFirestore, private fun: AngularFireFunctions, private http: HttpClient ) { }

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

  public create (parentUserId: string, data: any): Promise<void> {
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

  public update (parentUserId: string, data: any): Promise<void> {
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
        else reject(`User with userId ${parentUserId} was not found`);
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public delete(parentUserId: string): Promise<void> {
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

  public onboardCustomer (parentUserId: string, returnUrl: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = 'https://us-central1-eleutherios-website.cloudfunctions.net/stripe/onboard-user';

      firebase.auth().currentUser.getIdToken()
        .then(authToken => {
          const headers = new HttpHeaders({'Authorization': 'Bearer ' + authToken });
          return this.http.post(url, { uid: parentUserId, returnUrl: returnUrl }, { headers: headers }).toPromise();
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
          resolve(null);
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getUser (parentUserId: string): Observable<any> {
    return this.afs.doc<User>(`users/${parentUserId}`).valueChanges();
  }

  public getUserByUsername (username: string): Observable<any> {
    const that = this;

    var getByUsername = function () {
      return new Promise((resolve, reject) => {
        let query = that.afs.collection("users").ref.where('username', '==', username);

        query.get()
          .then(snapshot => {
            if (snapshot.size > 0)
              resolve(snapshot.docs[0].data());
            else
              resolve(null);
          })
          .catch(error => {
            reject(error);
          }
        );
      });
    };
    return from(getByUsername());
  }
}