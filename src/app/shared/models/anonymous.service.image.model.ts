export interface AnonymousServiceImage {
  serviceImageId: string,
  serviceId: string,
  imageId: string,
  imageUid: string,
  default: boolean, // indicates whether this image is the default
  lastUpdateDate: object, 
  creationDate: object 
}