export interface ServiceUserBlock {
  serviceUserBlockId,
  userId: string, // id of the user being blocked
  serviceId: string, // id of the service that is being blocked
  forumId: string, // id of the forum that is doing the blocking
  forumUid: string, // id of the owner of the forum doing the blocking
  lastUpdateDate: object,
  creationDate: object
}