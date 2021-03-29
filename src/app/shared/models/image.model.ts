export interface Image {
  imageId: string,
  uid: string, // id of the user who is creating this image
  name: string,
  filePath: string,
  tinyUrl: string,
  smallUrl: string,
  mediumUrl: string,
  largeUrl: string,
  default: boolean, // indicates whether this image is the default
  lastUpdateDate: object,
  creationDate: object
}

// fix imaging problem rob
