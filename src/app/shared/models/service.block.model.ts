export interface ServiceBlock {
  serviceBlockId: string,
  serviceId: string, // service being blocked
  serviceUid: string, // owner of service
  forumId: string, // forum doing the blocking
  forumUid: string, // owner of the forum
  lastUpdateDate: object,
  creationDate: object
}