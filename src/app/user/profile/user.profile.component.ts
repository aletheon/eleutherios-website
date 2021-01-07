import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import {
  PushMessageService,
  UserService
} from '../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckbox } from '@angular/material/checkbox';
import { NotificationSnackBar } from '../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import * as firebase from 'firebase/app';

@Component({
  selector: 'user-profile',
  templateUrl: './user.profile.component.html',
  styleUrls: ['./user.profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private _loading = new BehaviorSubject(false);
  private _initialUserSubscription: Subscription;
  private _userSubscription: Subscription;
  
  public user: Observable<any>;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private userService: UserService,
    private pushMessageService: PushMessageService,
    private snackbar: MatSnackBar,
    private router: Router) {
  }

  ngOnDestroy () {
    if (this._initialUserSubscription)
      this._initialUserSubscription.unsubscribe();

    if (this._userSubscription)
      this._userSubscription.unsubscribe();
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      let username = params['username'];

      this._initialUserSubscription = this.userService.getUserByUsername(username).subscribe(user => {
        this._initialUserSubscription.unsubscribe();

        if (user){
          this.user = this.userService.getUserByUsername(username);
          this.initForm();
        }
        else {
          const snackBarRef = this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: `User with username ${username} was not found`,
              panelClass: ['red-snackbar']
            }
          );
          this.router.navigate(['/']);
        }
      });
    });
  }

  private initForm () {
    const that = this;

    //  ongoing subscription
    this._initialUserSubscription = this.user.subscribe(user => {
      if (user){
        // do something
      }
    });

    // run once subscription
    const runOnceSubscription = this.user.subscribe(user => {
      this._loading.next(false);
      runOnceSubscription.unsubscribe();
    });
  }
}