export interface Activity {
  forumId: string,
  parentId: string, // id of the forum that this forum is being added to
  parentUid: string, // id of the user who owns the parent forum
  uid: string, // id of the user who created this forum
  type: string, // [public or private]
  title: string, // title of the forum
  title_lowercase: string, // for case insensitive searching
  description: string, // description of the forum
  website: string, // website of the forum
  indexed: boolean, // [true or false] indicates whether this forum is publicly available
  includeDescriptionInDetailPage: boolean,
  includeImagesInDetailPage: boolean,
  includeTagsInDetailPage: boolean,
  forumLastUpdateDate: object, 
  forumCreationDate: object 
  receivePosts: boolean, 
  highlightPost: boolean, 
  lastUpdateDate: object, 
  creationDate: object 
}