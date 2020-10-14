export interface Post {
  postId: string,
  forumId: string, // id of the forum that is managing this post
  forumUid: string,
  registrantId: string, // id of the registrant who is posting this message
  serviceId: string, // id of the service creating the post
  serviceUid: string,
  imageId: string, // id of the image being posted
  imageUid: string, // id of the user who manages the image being posted
  message: string, // message that was posted
  lastUpdateDate: object, 
  creationDate: object 
}