export interface Service {
  serviceId: string,
  uid: string, // id of the user who created this service
  type: string, // [public or private]
  title: string, // title of the service
  title_lowercase: string, // for case insensitive searching
  description: string, // description of the service
  website: string, // website of the service
  default: boolean, // whether this service is the default service for the owner
  indexed: boolean, // whether this service is indexed or hidden
  rate: number,  // average rating of the service for sorting purposes
  paymentType: string, // [Free|Paid]
  amount: number, // amount to pay for this service
  includeDescriptionInDetailPage: boolean,
  includeImagesInDetailPage: boolean,
  includeTagsInDetailPage: boolean,
  lastUpdateDate: object,
  creationDate: object 
}