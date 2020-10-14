export interface Alert {
  alertId: string,
  notificationId: string, // id of the notification that is receiving the alert
  notificationUid: string, // for redundancy purposes
  type: string, // [Forum or Service] type of alert this is
  forumServiceId: string, // forumId or serviceId that this alert points to
  forumServiceUid: string, // uid of the owner for the forum or service
  viewed: boolean, // [true or false] // indicating whether the end user has seen this alert or not
  lastUpdateDate: object, 
  creationDate: object 
}