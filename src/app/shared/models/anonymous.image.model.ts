export interface AnonymousImage {
  imageId: string,
  uid: string, // id of the user who is creating this image
  name: string,
  tinyUrl: string,
  smallUrl: string,
  mediumUrl: string,
  largeUrl: string,
  lastUpdateDate: object, 
  creationDate: object 
}