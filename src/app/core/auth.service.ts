import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { 
  UserService,
  User
} from '../shared';

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

  resetUserActivityHighlightPost(userId: string): Promise<void> {
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

  signOut() {
    this.afAuth.signOut().then(() => {
      this.router.navigate(['/login']).then(() => {
        this.uid = '';  
      });
    })
    .catch(error => {
      console.log('Sign out failed', error);
    });
  }
}