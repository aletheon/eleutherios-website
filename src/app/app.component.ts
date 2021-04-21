import { Component, OnInit, ViewChild, ViewContainerRef, ComponentRef, ComponentFactoryResolver } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/auth.service';
import { UserActivityOpenComponent } from './user/activity/user.activity.open.component';
import { UserActivityClosedComponent } from './user/activity/user.activity.closed.component';
import { GoogleTagManagerService } from 'angular-google-tag-manager';
import { MessageSharingService } from './shared';

import { Observable, Subject, combineLatest } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('activityComponent', { read: ViewContainerRef }) set content(ref: ViewContainerRef) {
    if (!!ref) {
      this._activityComponent = ref;
      this._appLoaded.next(true);
    }
  }

  private _activityComponent: ViewContainerRef;
  private _appLoaded = new Subject();
  private _activitySideBarState: Observable<boolean> = this.messageSharingService.activitySideBarState;
  private _containerOpenRef: ComponentRef<UserActivityOpenComponent>;
  private _containerClosedRef: ComponentRef<UserActivityClosedComponent>;

  public activitySideBarState: string = 'open';

  constructor(public auth: AuthService,
    private messageSharingService: MessageSharingService,
    private router: Router,
    private gtmService: GoogleTagManagerService,
    private resolver: ComponentFactoryResolver) {
  }

  ngOnInit() {
    // push GTM data layer for every visited page
    this.router.events.forEach(item => {
      if (item instanceof NavigationEnd) {
        const gtmTag = {
          event: 'page',
          pageName: item.url
        };
        this.gtmService.pushTag(gtmTag);
      }
    });

    // reset user
    const userSubscription = this.auth.user.subscribe(user =>{
      userSubscription.unsubscribe();

      if (user){
        // reset activity highlight post state
        // done once each time the user loads the app
        this.auth.resetUserActivityHighlightPost(user.uid);
      }
    });

    // initialize message sharing service
    this.messageSharingService.changeViewForumId('');

    combineLatest([this._appLoaded]).subscribe(appLoaded => {
      this._activitySideBarState.subscribe(state => {
        if (state){
          this.activitySideBarState = 'open';

          if (this._containerClosedRef) {
            this._containerClosedRef.destroy();
            this._containerClosedRef = null;
          }

          let componentFactory = this.resolver.resolveComponentFactory(UserActivityOpenComponent);
          this._containerOpenRef = this._activityComponent.createComponent(componentFactory);
          this._containerOpenRef.changeDetectorRef.detectChanges();
        }
        else {
          this.activitySideBarState = 'closed';

          if (this._containerOpenRef) {
            this._containerOpenRef.destroy();
            this._containerOpenRef = null;
          }

          let componentFactory = this.resolver.resolveComponentFactory(UserActivityClosedComponent);
          this._containerClosedRef = this._activityComponent.createComponent(componentFactory);
          this._containerClosedRef.changeDetectorRef.detectChanges();
        }
      });
    });
  }
}
