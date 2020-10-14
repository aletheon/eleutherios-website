export interface ServiceReview {
  serviceReviewId: string,
  serviceReviewServiceId: string, // service being reviewed
  serviceReviewServiceUid: string, // owner of service being reviewed
  serviceId: string, // service doing reviewing
  serviceUid: string, // owner of service doing reviewing
  review: string,
  lastUpdateDate: object,
  creationDate: object
}