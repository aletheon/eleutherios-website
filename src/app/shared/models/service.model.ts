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
  paymentType: string, // [Free|Payment|Donation|Subscription]
  amount: number, // amount to pay for this service { min: 0.50 USD, max: 999,999.99 }
  currency: string, // [usd, nzd, aud etc]
  includeDescriptionInDetailPage: boolean,
  includeImagesInDetailPage: boolean,
  includeTagsInDetailPage: boolean,
  lastUpdateDate: object,
  creationDate: object 
}