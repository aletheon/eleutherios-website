import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { IsLoggedIn } from './core/is.logged.in.guard';

// common

import { AboutComponent } from './about/about.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { AcceptableUsePolicyComponent } from './aup/acceptable.use.policy.component';
import { TermsOfServiceComponent } from './tos/terms.of.service.component';
import { HelpComponent } from './help/help.component';

// anonymous

import { AnonymousHomeComponent } from './anonymous/home/anonymous.home.component';
import { AnonymousForumDetailComponent } from './anonymous/forum/detail/anonymous.forum.detail.component';
import { AnonymousForumImageListComponent } from './anonymous/forum/image/anonymous.forum.image.list.component';
import { AnonymousServiceDetailComponent } from './anonymous/service/detail/anonymous.service.detail.component';
import { AnonymousServiceImageListComponent } from './anonymous/service/image/anonymous.service.image.list.component';

// public

import { ForumListComponent } from './forum/list/forum.list.component';
import { ForumDetailComponent } from './forum/detail/forum.detail.component';
import { ForumImageListComponent } from './forum/image/forum.image.list.component';
import { ServiceListComponent } from './service/list/service.list.component';
import { ServiceDetailComponent } from './service/detail/service.detail.component';
import { ServiceImageListComponent } from './service/image/service.image.list.component';
import { ServiceRateCreateComponent } from './service/rate/create/service.rate.create.component';
import { ServiceRateListComponent } from './service/rate/list/service.rate.list.component';
import { ServiceReviewCreateComponent } from './service/review/create/service.review.create.component';
import { ServiceReviewListComponent } from './service/review/list/service.review.list.component';
import { ServiceReviewViewComponent } from './service/review/view/service.review.view.component';

// user

import { UserProfileComponent } from './user/profile/user.profile.component';
import { UserImageListComponent } from './user/image/list/user.image.list.component';
import { UserImageViewComponent } from './user/image/view/user.image.view.component';
import { UserServiceNewComponent } from './user/service/new/user.service.new.component';
import { UserServiceEditComponent } from './user/service/edit/user.service.edit.component';
import { UserServiceListComponent } from './user/service/list/user.service.list.component';
import { UserServiceRateCreateComponent } from './user/service/rate/create/user.service.rate.create.component';
import { UserServiceRateListComponent } from './user/service/rate/list/user.service.rate.list.component';
import { UserServiceReviewCreateComponent } from './user/service/review/create/user.service.review.create.component';
import { UserServiceReviewListComponent } from './user/service/review/list/user.service.review.list.component';
import { UserServiceReviewViewComponent } from './user/service/review/view/user.service.review.view.component';
import { UserServiceDetailComponent } from './user/service/detail/user.service.detail.component';
import { UserServiceImageListComponent } from './user/service/image/user.service.image.list.component';
import { UserServiceForumBlockListComponent } from './user/service/block/user.service.forum.block.list.component';
import { UserServiceUserBlockListComponent } from './user/service/block/user.service.user.block.list.component';
import { UserForumNewComponent } from './user/forum/new/user.forum.new.component';
import { UserForumEditComponent } from './user/forum/edit/user.forum.edit.component';
import { UserForumListComponent } from './user/forum/list/user.forum.list.component';
import { UserForumForumNewComponent } from './user/forum/forum/user.forum.forum.new.component';
import { UserForumServiceAddComponent } from './user/forum/service/user.forum.service.add.component';
import { UserForumDetailComponent } from './user/forum/detail/user.forum.detail.component';
import { UserForumImageListComponent } from './user/forum/image/user.forum.image.list.component';
import { UserForumViewComponent } from './user/forum/view/user.forum.view.component';
import { UserForumServiceBlockListComponent } from './user/forum/block/user.forum.service.block.list.component';
import { UserForumUserBlockListComponent } from './user/forum/block/user.forum.user.block.list.component';
import { UserNotificationNewComponent } from './user/notification/new/user.notification.new.component';
import { UserNotificationEditComponent } from './user/notification/edit/user.notification.edit.component';
import { UserNotificationListComponent } from './user/notification/list/user.notification.list.component';
import { UserTagListComponent } from './user/tag/list/user.tag.list.component';
import { UserAlertListComponent } from './user/alert/list/user.alert.list.component';
import { UserSettingEditComponent } from './user/setting/edit/user.setting.edit.component';
import { UserPaymentNewComponent } from './user/payment/new/user.payment.new.component';
import { UserPaymentListComponent } from './user/payment/list/user.payment.list.component';
import { UserPaymentViewComponent } from './user/payment/view/user.payment.view.component';
import { UserReceiptListComponent } from './user/receipt/list/user.receipt.list.component';
import { UserReceiptViewComponent } from './user/receipt/view/user.receipt.view.component';

const routes: Routes = [
  // **********************************************
  // common routines
  // **********************************************
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'help',
    component: HelpComponent
  },
  {
    path: 'privacy',
    component: PrivacyComponent
  },
  {
    path: 'tos',
    component: TermsOfServiceComponent
  },
  {
    path: 'aup',
    component: AcceptableUsePolicyComponent
  },
  {
    path: 'about',
    component: AboutComponent
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [IsLoggedIn]
  },
  // **********************************************
  // anonymous routines
  // **********************************************
  {
    path: ':username',
    component: UserProfileComponent,
  },
  {
    path: 'anonymous/home',
    component: AnonymousHomeComponent
  },
  {
    path: 'anonymous/forum/detail',
    component: AnonymousForumDetailComponent
  },
  {
    path: 'anonymous/service/detail',
    component: AnonymousServiceDetailComponent
  },
  {
    path: 'anonymous/forum/image/list',
    component: AnonymousForumImageListComponent
  },
  {
    path: 'anonymous/service/image/list',
    component: AnonymousServiceImageListComponent
  },
  // **********************************************
  // public routines
  // **********************************************
  {
    path: 'service/list',
    component: ServiceListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/detail',
    component: ServiceDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/image/list',
    component: ServiceImageListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/rate/create',
    component: ServiceRateCreateComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/rate/list',
    component: ServiceRateListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/review/create',
    component: ServiceReviewCreateComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/review/view',
    component: ServiceReviewViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'service/review/list',
    component: ServiceReviewListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'forum/list',
    component: ForumListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'forum/detail',
    component: ForumDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'forum/image/list',
    component: ForumImageListComponent,
    canActivate: [AuthGuard]
  },
  // **********************************************
  // user routines
  // **********************************************
  {
    path: 'user/image/list',
    component: UserImageListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/image/view',
    component: UserImageViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/new',
    component: UserServiceNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/edit',
    component: UserServiceEditComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/list',
    component: UserServiceListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/rate/create',
    component: UserServiceRateCreateComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/rate/list',
    component: UserServiceRateListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/review/create',
    component: UserServiceReviewCreateComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/review/view',
    component: UserServiceReviewViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/review/list',
    component: UserServiceReviewListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/detail',
    component: UserServiceDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/payment/new',
    component: UserPaymentNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/payment/list',
    component: UserPaymentListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/payment/view',
    component: UserPaymentViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/receipt/list',
    component: UserReceiptListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/receipt/view',
    component: UserReceiptViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/image/list',
    component: UserServiceImageListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/block/forum/list',
    component: UserServiceForumBlockListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/service/block/user/list',
    component: UserServiceUserBlockListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/new',
    component: UserForumNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/new',
    component: UserForumNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/edit',
    component: UserForumEditComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/forum/new',
    component: UserForumForumNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/service/add',
    component: UserForumServiceAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/list',
    component: UserForumListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/detail',
    component: UserForumDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/image/list',
    component: UserForumImageListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/view',
    component: UserForumViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/block/service/list',
    component: UserForumServiceBlockListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/forum/block/user/list',
    component: UserForumUserBlockListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/notification/new',
    component: UserNotificationNewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/notification/edit',
    component: UserNotificationEditComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/notification/list',
    component: UserNotificationListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/alert/list',
    component: UserAlertListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/tag/list',
    component: UserTagListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user/setting/edit',
    component: UserSettingEditComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }