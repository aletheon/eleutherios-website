import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UserService } from '../shared/services/user.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { environment } from '../../environments/environment'
import { Location } from '@angular/common';
import { User } from '../shared/models/user.model';

import * as firebase from 'firebase/app';
import { Observable, BehaviorSubject } from 'rxjs';
import * as _ from "lodash";

@Component({
  selector: 'app-login-link',
  templateUrl: './login.link.component.html',
  styleUrls: ['./login.link.component.css']
})
export class LoginLinkComponent implements OnInit {
  private _loading = new BehaviorSubject(false);
  public loading: Observable<boolean> = this._loading.asObservable();

  user: Observable<any>;
  email: string = '';
  tempEmail: string = '';
  emailSent = false;
  errorMessage: string;

  constructor(private afs: AngularFirestore, 
    public afAuth: AngularFireAuth,
    private auth: AuthService,
    private userService: UserService,
    private location: Location,
    private router: Router) {}

  ngOnInit() {
    this.user = this.afAuth.authState;
    const url = this.router.url;
    
    let emailAddressElement = <HTMLInputElement> document.getElementById("emailAddress");
    let submitButtonElement = <HTMLButtonElement> document.getElementById("submitButton");

    emailAddressElement.disabled = true;
    submitButtonElement.disabled = true;

    this._loading.next(true);

    if (url.includes('signIn')) {
      this.confirmSignIn(url).then(() => {
        this._loading.next(false);
        emailAddressElement.disabled = false;
        submitButtonElement.disabled = false;
        this.router.navigate(['/']);
      })
      .catch(error => {
        this._loading.next(false);
        let signingUserIn: boolean = false;

        if (window.localStorage.getItem('signingUserIn')){
          if (window.localStorage.getItem('signingUserIn') == 'true')
            signingUserIn = true;
        }

        if (!signingUserIn){
          emailAddressElement.disabled = false;
          submitButtonElement.disabled = false;
          this.errorMessage = error.message;
        }
      });
    }
    else {
      this._loading.next(false);
      emailAddressElement.disabled = false;
      submitButtonElement.disabled = false;
    }
  }

  sendEmailLink() {
    const actionCodeSettings = {
      // Your redirect URL
      url: 'https://' + environment.firebase.authDomain + '/login/link', // 'http://localhost:4200/login/link'
      handleCodeInApp: true
    };
    window.localStorage.removeItem('signingUserIn');

    if (this.email.length > 0){
      this.tempEmail = this.email;
      this.afAuth.sendSignInLinkToEmail(
        this.email,
        actionCodeSettings
      ).then(() => {
        window.localStorage.setItem('email', this.email);
        this.emailSent = true;
        this.errorMessage = '';
      })
      .catch(error => {
        this.errorMessage = error.message;
      });
    }
    else this.errorMessage = 'You did not provide an email address.';
  }

  confirmSignIn(url) {
    return new Promise<void>((resolve, reject) => {
      if (this.afAuth.isSignInWithEmailLink(url)) {
        let email = window.localStorage.getItem('email');
  
        // If missing email, prompt user for it
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
  
        // Signin user and remove the email localStorage
        if (email){
          this.afAuth.signInWithEmailLink(email, url).then(credential => {
            var user = credential.user;
            const userRef = this.afs.collection('users').doc(user.uid);

            window.localStorage.setItem('signingUserIn', 'true');

            userRef.ref.get().then((doc) => {
              if (doc.exists) {
                const data: any = {
                  email: user.email,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                };

                userRef.update(data).then(() => {
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              } else {
                user.updateProfile({
                  displayName: email.split("@")[0],
                  photoURL: ''
                }).then(() => {
                  const data: User = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    stripeCustomerId: '',
                    stripeAccountId: '',
                    stripeOnboardingStatus: '',
                    stripeCurrency: '',
                    fcmToken: '',
                    receivePushNotifications: false,
                    receiveForumAlertNotifications: false,
                    receiveServiceAlertNotifications: false,
                    receiveForumPostNotifications: false,
                    receiveAlphaNotification: true,
                    creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
                  };
  
                  this.userService.create(user.uid, data).then(() => {
                    window.localStorage.removeItem('email');
                    window.localStorage.removeItem('signingUserIn');
                    resolve();
                  })
                  .catch(error => {
                    reject(error);
                  });
                  resolve();
                })
                .catch(error => {
                  reject(error);
                });
              }
            }).catch(error => {
              reject(error);
            });
          })
          .catch(error => {
            reject(error);
          });
        }
      }
      else reject('No sign in url provided');
    });
  }

  public navigateBack () {
    this.location.back();
  }
}