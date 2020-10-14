export interface ServiceReviewComment {
  serviceReviewCommentId: string,
  serviceReviewId: string, // review being commented on
  serviceReviewServiceId: string, // service being reviewed
  serviceReviewServiceUid: string, // owner of service being reviewed
  serviceId: string, // service creating comment
  serviceUid: string, // owner of service creating comment
  comment: string,
  lastUpdateDate: object,
  creationDate: object
}