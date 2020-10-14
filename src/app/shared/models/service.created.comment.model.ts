export interface ServiceCreatedComment {
  serviceCreatedCommentId: string,
  serviceReviewCommentId: string,
  serviceReviewId: string, // review being commented on
  serviceReviewServiceId: string, // service being reviewed
  serviceReviewServiceUid: string, // owner of service being reviewed
  comment: string,
  lastUpdateDate: object,
  creationDate: object
}