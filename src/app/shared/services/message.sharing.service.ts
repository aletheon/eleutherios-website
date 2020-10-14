import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class MessageSharingService {
  private viewForumIdSource = new BehaviorSubject<string>('');
  public activitySideBarStateSource = new BehaviorSubject<boolean>(true);

  public viewForumId = this.viewForumIdSource.asObservable();
  public activitySideBarState = this.activitySideBarStateSource.asObservable();
  
  constructor() {
  }

  public changeViewForumId(forumId: string) {
    this.viewForumIdSource.next(forumId);
  }

  public changeActivitySideBarState(state: boolean) {
    this.activitySideBarStateSource.next(state);
  }
}