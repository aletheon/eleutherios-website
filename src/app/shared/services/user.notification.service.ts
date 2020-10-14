import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';

import * as firebase from 'firebase/app';
import { Observable } from 'rxjs';

@Injectable()
export class UserNotificationService {
  constructor(private afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists (parentUserId: string, notificationId: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const notificationRef = this.afs.collection(`users/${parentUserId}/notifications`).doc(notificationId);

      notificationRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getNotificationFromPromise (parentUserId: string, notificationId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let notificationRef = this.afs.collection(`users/${parentUserId}/notifications`).doc(notificationId);

      notificationRef.ref.get()
        .then(doc => {
          if (doc.exists)
            resolve(doc.data());
          else
            resolve();
        })
        .catch(error => {
          reject(error);
        }
      );
    });
  }

  public getNotification (parentUserId: string, notificationId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/notifications`).doc(notificationId).valueChanges();
  }

  public create (parentUserId: string, data: any): Observable<any> {
    const notificationRef = this.afs.collection(`users/${parentUserId}/notifications`).doc(this.afs.createId());
    data.notificationId = notificationRef.ref.id;
    notificationRef.set(data);
    return notificationRef.valueChanges();
  }

  public update (parentUserId: string, notificationId: string, data: any) {
    const notificationRef = this.afs.collection(`users/${parentUserId}/notifications`).doc(notificationId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return notificationRef.update(data);
  }

  public delete (parentUserId: string, notificationId: string) {
    const notificationRef = this.afs.collection(`users/${parentUserId}/notifications`).doc(notificationId);
    return notificationRef.delete();
  }

  public getNotificationsSearchTerm (type: string, parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean): Observable<any[]> {
    let collectionName: string = '';

    if (type == 'All')
      collectionName = `users/${parentUserId}/notifications`;
    else if (type == 'Forum')
      collectionName = `users/${parentUserId}/forumnotifications`;
    else
      collectionName = `users/${parentUserId}/servicenotifications`;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();

          if (type == 'All')
            collectionName = `users/${parentUserId}/notificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
          else if (type == 'Forum')
            collectionName = `users/${parentUserId}/forumnotificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
          else
          collectionName = `users/${parentUserId}/servicenotificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
        }
      }
      else {
        if (type == 'All')
          collectionName = `users/${parentUserId}/notificationsnotags`;
        else if (type == 'Forum')
          collectionName = `users/${parentUserId}/forumnotificationsnotags`;
        else
          collectionName = `users/${parentUserId}/servicenotificationsnotags`;
      }
    }
    return this.afs.collection<any>(collectionName, ref => ref.orderBy('title_lowercase').startAt(key.toLowerCase()).endAt(key.toLowerCase()+"\uf8ff").limit(numberOfItems+1)).valueChanges();
  }

  public getNotifications (type: string, parentUserId: string, numberOfItems: number, key?: any, tags?: string[], includeTagsInSearch?: boolean): Observable<any[]> {
    let collectionName: string = '';

    if (type == 'All')
      collectionName = `users/${parentUserId}/notifications`;
    else if (type == 'Forum')
      collectionName = `users/${parentUserId}/forumnotifications`;
    else
      collectionName = `users/${parentUserId}/servicenotifications`;

    if (includeTagsInSearch !== undefined){
      if (includeTagsInSearch == true){
        if (tags && tags.length > 0){
          tags.sort();

          if (type == 'All')
            collectionName = `users/${parentUserId}/notificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
          else if (type == 'Forum')
            collectionName = `users/${parentUserId}/forumnotificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
          else
            collectionName = `users/${parentUserId}/servicenotificationscollection/${tags.toString().replace(/,/gi,'')}/notifications`;
        }
      }
      else {
        if (type == 'All')
          collectionName = `users/${parentUserId}/notificationsnotags`;
        else if (type == 'Forum')
          collectionName = `users/${parentUserId}/forumnotificationsnotags`;
        else
          collectionName = `users/${parentUserId}/servicenotificationsnotags`;
      }
    }

    if (!key){
      return this.afs.collection<any>(collectionName, ref => ref
        .orderBy('creationDate','desc')
        .limit(numberOfItems+1))
        .valueChanges();
    }
    else {
      return this.afs.collection<any>(collectionName, ref => ref
        .orderBy('creationDate','desc')
        .startAt(key)
        .limit(numberOfItems+1))
        .valueChanges(); 
    }
  }
}