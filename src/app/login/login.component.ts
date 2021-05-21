import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { FacebookService, InitParams, LoginResponse } from 'ngx-facebook';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../shared/components/notification.snackbar.component';
import * as _ from "lodash";
import * as firebase from 'firebase/app';
import * as firebaseui from 'firebaseui';
import {
  UserService,
  User
} from '../shared';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private _forumId : string;
  private _serviceId : string;
  private _ui: firebaseui.auth.AuthUI;

  constructor(private auth: AuthService,
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private fb: FacebookService,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private router: Router){
      let initParams: InitParams = {
        appId: '429892814591786',
        xfbml: true,
        version: 'v2.8'
      };
      this.fb.init(initParams);
  }

  ngOnInit () {
    const that = this;

    // redirect the user if they are logged in
    if (this.auth.uid && this.auth.uid.length > 0){
      // get ids for other sources
      this.route.queryParams.subscribe((params: Params) => {
        let forumId = params['forumId'] ? params['forumId'] : '';
        let serviceId = params['serviceId'] ? params['serviceId'] : '';

        // redirect to other sources
        if (forumId.length > 0)
          this.router.navigate(['/forum/detail'], { queryParams: { forumId: forumId } });
        else if (serviceId)
          this.router.navigate(['/service/detail'], { queryParams: { serviceId: serviceId } });
        else
          this.router.navigate(['/']);
      });
    }

    const uiConfig = {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID
      ],
      tosUrl: 'https://eleutherios.org.nz/tos',
      privacyPolicyUrl: 'https://eleutherios.org.nz/privacy',
      callbacks: {
        signInSuccessWithAuthResult: function (authResult) {
          const userRef: AngularFirestoreDocument<User> = that.afs.doc(`users/${authResult.user.uid}`);
          userRef.ref.get().then((doc) => {
            if (doc.exists) {
              // const data: any = {
              //   email: authResult.user.email,
              //   displayName: authResult.user.displayName,
              //   photoUrl: authResult.user.photoURL,
              //   lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
              // };
              // userRef.update(data);
            } else {
              const data: User = {
                uid: authResult.user.uid,
                email: authResult.user.email,
                displayName: authResult.user.displayName,
                photoUrl: authResult.user.photoURL,
                username: authResult.user.uid.substring(0,20),
                website: '',
                stripeCustomerId: '',
                stripeAccountId: '',
                stripeOnboardingStatus: '',
                stripeCurrency: '',
                fcmToken: '',
                receivePushNotifications: false,
                receiveForumAlertNotifications: false,
                receiveServiceAlertNotifications: false,
                receiveForumPostNotifications: false,
                receiveAlphaNotification: false,
                creationDate: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
              };
              that.userService.create(authResult.user.uid, data);
            }
          }).catch(error => {
            console.error(error);
          });
          return false;
        },
        uiShown: function () {
          // The widget is rendered.
          // Hide the loader.
          // document.getElementById('loader').style.display = 'none';
        }
      }
    };
    this._ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebase.auth());
    this._ui.start('#firebaseui-auth-container', uiConfig);
  }
}
