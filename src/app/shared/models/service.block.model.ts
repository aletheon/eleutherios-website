export interface ServiceBlock {
  serviceBlockId: string,
  serviceId: string, // id of the service being blocked
  serviceUid: string, // id of the service owner
  forumId: string, // id of the forum doing the blocking
  forumUid: string, // id of the forum owner
  lastUpdateDate: object,
  creationDate: object
}
