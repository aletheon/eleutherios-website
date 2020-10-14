import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

import { Observable } from 'rxjs';

@Injectable()
export class UserForumBreadcrumbService {
  constructor(private afs: AngularFirestore) { }
  
  public getBreadcrumbs (parentUserId: string, forumId: string): Observable<any[]> {
    return this.afs.collection<any>(`users/${parentUserId}/forums/${forumId}/breadcrumbs`, ref => ref.orderBy('sortOrder')).valueChanges();
  }
}