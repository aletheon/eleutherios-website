import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { FacebookService, InitParams, LoginResponse } from 'ngx-facebook';

import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationSnackBar } from '../shared/components/notification.snackbar.component';
import * as _ from "lodash";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private _forumId : string;
  private _serviceId : string;

  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private fb: FacebookService,
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
    // ensure user is not logged in to view this page
    if (this.auth.uid && this.auth.uid.length > 0){
      // get ids for other sources
      this.route.queryParams.subscribe((params: Params) => {
        let forumId = params['forumId'];
        let serviceId = params['serviceId'];
  
        // redirect to other sources
        if (forumId)
          this.router.navigate(['/forum/detail'], { queryParams: { forumId: forumId } });
        else if (serviceId)
          this.router.navigate(['/service/detail'], { queryParams: { serviceId: serviceId } });
        else
          this.router.navigate(['/']);
      });
    }
  }

  loginWithGoogle () {
    this.auth.googleLogin()
      .then(() => {
        this.router.navigate(['/']);
      })
      .catch((error) => {
        console.error(error);  
      }
    );
  }

  loginWithFacebook () {
    this.fb.login({scope: 'email, public_profile'})
      .then((response: LoginResponse) => {
        this.auth.facebookLogin(response.authResponse.accessToken).then(() => {
          this.router.navigate(['/']);
        })
        .catch(error => {
          // cannot register with an existing or the same email address
          if (_.includes(error.message, 'An account already exists with the same email address')){
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `The email address ${error.email} already exists`,
                panelClass: ['red-snackbar']
              }
            );
          }
          else console.error(error);
        });
      })
      .catch(error => {
        console.error(error);
      }
    );
  }
}