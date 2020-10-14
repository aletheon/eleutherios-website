export interface ForumUserBlock {
  forumUserBlockId: string,
  userId: string, // id of the user being blocked
  forumId: string, // id of the forum that is being blocked
  serviceId: string, // id of the service that is doing the blocking
  serviceUid: string, // id of the owner of the service doing the blocking
  lastUpdateDate: object,
  creationDate: object
}