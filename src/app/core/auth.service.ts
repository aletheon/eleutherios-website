import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { 
  UserService,
  User
} from '../shared';

import * as firebase from 'firebase/app';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class AuthService {
  public user: Observable<User>;
  public uid: string = '';

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private userService: UserService
  ) {
    // get auth data, then get firestore user document || null
    this.user = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user){
          this.uid = user.uid;
          return this.userService.getUser(user.uid);
        }
        else return of(null);
      })
    );
  }

  resetUserActivityHighlightPost(userId: string){
    return new Promise((resolve, reject) => {
      // reset highlight post flags on all users activities
      let query = this.afs.collection(`users/${userId}/activities`).ref;

      query.get()
        .then(snapshot => {
          if (snapshot.size > 0){
            let batch = this.afs.firestore.batch();

            snapshot.docs.forEach(doc => {
              batch.update(doc.ref, { highlightPost: false });
            });
            batch.commit();
          }
          resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  facebookLogin(accessToken){
    return new Promise((resolve, reject) => {
      this.afAuth.signInWithCredential(firebase.auth.FacebookAuthProvider.credential(accessToken))
        .then((credential) => {
          this.updateUserData(credential.user);
          resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  googleLogin(){
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.oAuthLogin(provider);
  }

  oAuthLogin(provider){
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    return this.afAuth.signInWithPopup(provider)
      .then((credential) => {
        this.updateUserData(credential.user);
      }
    );
  }

  updateUserData(user){
    // sets user data to firestore on login
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(`users/${user.uid}`);

    userRef.ref.get().then((doc) => {
      if (doc.exists) {
        const data: any = {
          email: user.email,
          displayName: user.displayName,
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        userRef.update(data);
      } else {
        const data: User = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          fcmToken: '',
          receivePushNotifications: false,
          receiveForumAlertNotifications: false,
          receiveServiceAlertNotifications: false,
          receiveForumPostNotifications: false,
          receiveAlphaNotification: false,
          creationDate: firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        this.userService.create(user.uid, data);
      }
    }).catch(error => {
      console.log("Error getting document:", error);
    });
  }

  signOut() {
    this.afAuth.signOut().then(() => {
      this.uid = '';
      this.router.navigate(['/login']);
    });
  }
}