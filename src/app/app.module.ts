import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';

import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { ReactiveFormsModule } from '@angular/forms';
import { MomentModule } from 'angular2-moment';
import { FlexLayoutModule } from "@angular/flex-layout";
import { LinkyModule } from 'angular-linky';
import { StarRatingModule } from 'angular-star-rating';

import { AppRoutingModule } from './app-routing.module';
import { AuthGuard } from './core/auth.guard';
import { IsLoggedIn } from './core/is.logged.in.guard';
import { AppComponent } from './app.component';

import { environment } from '../environments/environment';

import { LoadingSpinnerModule } from './shared/';
import { BackModule } from './shared/';
import { PipeModule } from './shared/';
import { CoreModule } from './core/core.module';
import { FacebookModule } from 'ngx-facebook';
import { NgxStripeModule } from 'ngx-stripe';

// common

import { AboutModule } from './about/about.module';
import { AnonymousModule } from './anonymous/anonymous.module';
import { HomeModule } from './home/home.module';
import { LoginModule } from './login/login.module';
import { PrivacyModule } from './privacy/privacy.module';

// public

import { ForumModule } from './forum/forum.module';
import { ServiceModule } from './service/service.module';

// user

import { UserActivityModule } from './user/activity/user.activity.module';
import { UserAlertModule } from './user/alert/user.alert.module';
import { UserForumModule } from './user/forum/user.forum.module';
import { UserImageModule } from './user/image/user.image.module';
import { UserNotificationModule } from './user/notification/user.notification.module';
import { UserServiceModule } from './user/service/user.service.module';
import { UserSettingModule } from './user/setting/user.setting.module';
import { UserTagModule } from './user/tag/user.tag.module';

// Some components (mat-slide-toggle, mat-slider, matTooltip) rely on HammerJS for gestures. In order to get the full feature-set of these components, HammerJS must be loaded into the application.
// You can add HammerJS to your application via npm, a CDN (such as the Google CDN), or served directly from your app.
import 'hammerjs';

import {
  NotificationSnackBar,
  SiteTotalService
} from './shared/';

import { HeaderComponent } from './layout/header.component';
import { FooterComponent } from './layout/footer.component';

import { UserActivityOpenComponent } from './user/activity/user.activity.open.component';
import { UserActivityClosedComponent } from './user/activity/user.activity.closed.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    NotificationSnackBar
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatMenuModule,
    MatTooltipModule,
    MatSidenavModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireStorageModule,
    AngularFireFunctionsModule,
    ReactiveFormsModule,
    MomentModule,
    FlexLayoutModule,
    LinkyModule,
    AppRoutingModule,
    LoadingSpinnerModule,
    BackModule,
    PipeModule,
    AboutModule,
    AnonymousModule,
    CoreModule,
    ForumModule,
    HomeModule,
    LoginModule,
    PrivacyModule,
    ServiceModule,
    UserActivityModule,
    UserAlertModule,
    UserForumModule,
    UserImageModule,
    UserNotificationModule,
    UserServiceModule,
    UserSettingModule,
    UserTagModule,
    StarRatingModule.forRoot(),
    FacebookModule.forRoot(),
    NgxStripeModule.forRoot(environment.stripeTest_publishable_key)
  ],
  providers: [AuthGuard, IsLoggedIn, SiteTotalService, { provide: 'googleTagManagerId', useValue: environment.googleTagManagerId } ],
  bootstrap: [AppComponent],
  entryComponents: [NotificationSnackBar, UserActivityOpenComponent, UserActivityClosedComponent]
})
export class AppModule { }