export interface ServiceCreatedReview {
  serviceCreatedReviewId: string,
  serviceReviewId: string,
  serviceReviewServiceId: string, // service being reviewed
  serviceReviewServiceUid: string, // owner of service being reviewed
  review: string,
  lastUpdateDate: object,
  creationDate: object
}