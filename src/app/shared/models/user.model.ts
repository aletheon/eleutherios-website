export interface User {
  uid: string,
  email: string, // email of the user
  displayName?: string, // display name
  fcmToken: string,
  receivePushNotifications: boolean,
  receiveForumAlertNotifications: boolean,
  receiveServiceAlertNotifications: boolean,
  receiveForumPostNotifications: boolean,
  receiveAlphaNotification: boolean,
  lastUpdateDate: object,
  creationDate: object
}