export interface Registrant {
  registrantId: string,
  parentId: string, // id of the registrant that added this registrant
  serviceId: string, // id of the service that is registering
  uid: string, // id of the user who manages the service
  forumId: string, // id of the forum managing this registrant
  forumUid: string, // id of the user managing the forum
  default: boolean, // default registrant
  indexed: boolean, // whether this registrant is indexed or hidden
  lastUpdateDate: object,
  creationDate: object 
}