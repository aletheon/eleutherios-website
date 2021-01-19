export interface User {
  uid: string,
  email: string, // email of the user
  displayName?: string,
  photoUrl?: string,
  username: string,
  website: string, // website of the user
  stripeCustomerId: string,
  stripeAccountId: string,
  stripeOnboardingStatus: string, // [Pending, Authorized, Deauthorized]
  stripeCurrency: string, // [usd, nzd, aud etc]
  fcmToken: string,
  receivePushNotifications: boolean,
  receiveForumAlertNotifications: boolean,
  receiveServiceAlertNotifications: boolean,
  receiveForumPostNotifications: boolean,
  receiveAlphaNotification: boolean,
  lastUpdateDate: object,
  creationDate: object
}