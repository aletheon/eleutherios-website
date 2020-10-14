export interface AnonymousService {
  serviceId: string,
  uid: string, // id of the user who created this service
  type: string, // [public or private]
  title: string, // title of the service
  description: string, // description of the service
  website: string, // website of the service
  indexed: boolean, // [true or false] indicates whether this service is publicly available
  lastUpdateDate: object, 
  creationDate: object 
}