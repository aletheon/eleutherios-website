export interface Notification {
  notificationId: string,
  uid: string, // id of the user who is creating this notification
  type: string, // [Forum or Service] indicates what type of notification the end is listening for
  title: string, // title of the notification
  title_lowercase: string, // for case insensitive searching
  active: boolean, // [true or false] - indicates whether this notification is active or not
  paymentType: string, // [Free|Payment|Donation|Subscription]
  startAmount: number,
  endAmount: number,
  lastUpdateDate: object, 
  creationDate: object 
}