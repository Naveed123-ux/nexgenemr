export type ObjectIdString = string

export interface CategoryDoc {
  _id?: ObjectIdString
  title: string
  description: string
  icon?: string
  // number of articles is computed; optional here
}

export interface ArticleDoc {
  _id?: ObjectIdString
  title: string
  content: string
  categoryId: ObjectIdString
  // optional fields for future
  createdAt?: string
  updatedAt?: string
}

export interface UserDoc {
  _id?: ObjectIdString
  email: string
  passwordHash: string
  role: "admin"
  createdAt?: string
}
