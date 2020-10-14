export interface ForumBlock {
  forumBlockId: string,
  forumId: string, // forum being blocked
  forumUid: string, // owner of forum
  serviceId: string, // service doing the blocking
  serviceUid: string, // owner of the service
  lastUpdateDate: object,
  creationDate: object
}