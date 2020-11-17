import { Component, OnInit } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';
import {
  SiteTotalService,
  MessageSharingService,
  UserService,
  User
} from '../shared';
import { Subscription, Observable, of } from 'rxjs';

@Component({
  selector: 'layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  private _userTotalSubscription: Subscription;
  private _forumTotalSubscription: Subscription;
  private _serviceTotalSubscription: Subscription;

  public userTotal: Observable<any>;
  public forumTotal: Observable<any>;
  public serviceTotal: Observable<any>;

  constructor(public auth: AuthService,
    private siteTotalService: SiteTotalService,
    private userService: UserService,
    private messageSharingService: MessageSharingService,
    private router: Router
    ) {
  }

  home () {
    this.router.navigate(['/']);
  }

  logout() {
    this.auth.signOut();
  }

  ngOnInit () {
    // get user totals
    this.auth.user.subscribe(user => {
      if (user){
        // get user total
        this._userTotalSubscription = this.siteTotalService.getTotal(user.uid)
          .subscribe(total => {
            if (total)
              this.userTotal = of(total);
            else {
              let total = {
                forumCount: 0,
                serviceCount: 0,
                notificationCount: 0,
                imageCount: 0,
                forumNotificationCount: 0,
                serviceNotificationCount: 0,
                tagCount: 0,
                alertCount: 0,
                forumAlertCount: 0, 
                serviceAlertCount: 0, 
                forumBlockCount: 0,
                serviceBlockCount: 0,
                forumUserBlockCount: 0,
                serviceUserBlockCount: 0
              };
              this.userTotal = of(total);
            }
          }
        );
      }
    });

    // get public forum total
    this._forumTotalSubscription = this.siteTotalService.getTotal('forum')
      .subscribe(total => {
        this.forumTotal = of(total);
      }
    );

    // get public service total
    this._serviceTotalSubscription = this.siteTotalService.getTotal('service')
      .subscribe(total => {
        this.serviceTotal = of(total);
      }
    );
  }
}