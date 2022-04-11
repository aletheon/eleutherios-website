export interface AnonymousForum {
  forumId: string,
  parentId: string, // id of the forum that this forum is being added to
  uid: string, // id of the user who created this forum
  type: string, // [public or private]
  title: string, // title of the forum
  description: string, // description of the forum
  website: string, // website of the forum
  indexed: boolean, // [true or false] indicates whether this forum is publicly available
  lastUpdateDate: object,
  creationDate: object
}
