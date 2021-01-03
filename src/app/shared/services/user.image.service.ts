import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';
import { Upload } from '../classes/upload';
import { Image } from '../models';

import * as firebase from 'firebase/app';
import { Observable, of, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as _ from "lodash";

// class Upload {
//   $key: string;
//   file: File;
//   name: string;
//   url: string;
//   progress: number;
//   createdAt: Date = new Date();

//   constructor (file:File) {
//     this.file = file;
//   }
// };

@Injectable()
export class UserImageService {
  constructor(public afs: AngularFirestore,
    private db: AngularFireDatabase) { }

  private createUserImage (parentUserId: string, image: any): Promise<void> {
    return new Promise((resolve, reject) => {
      let userImageRef = this.afs.firestore.collection(`users/${parentUserId}/images`).doc(image.imageId);
      userImageRef.set(image).then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  // *********************************************************************
  // public methods
  // *********************************************************************
  public exists(parentUserId: string, imageId: string): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      const imageRef = this.afs.collection(`users/${parentUserId}/images`).doc(imageId);

      imageRef.ref.get().then(doc => {
        if (doc.exists)
          resolve(true);
        else
          resolve(false);
      });
    });
  }

  public getImageFromPromise(parentUserId: string, imageId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afs.collection(`users/${parentUserId}/images`).doc(imageId).ref.get().then(doc => {
        if (doc.exists)
          resolve(doc.data());
        else
          resolve(null);
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getImage (parentUserId: string, imageId: string): Observable<any> {
    return this.afs.collection(`users/${parentUserId}/images`).doc(imageId).valueChanges();
  }

  public create (parentUserId: string, upload: Upload) {
    let storageRef = firebase.storage().ref();
    let id = this.afs.createId();
    let storageFilePath: string = `users/${parentUserId}/${id}_${upload.file.name}`;
    let uploadTask = storageRef.child(storageFilePath).put(upload.file);

    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) =>  {
        // upload in progress
        upload.progress = (uploadTask.snapshot.bytesTransferred / uploadTask.snapshot.totalBytes) * 100
      },
      (error) => {
        // upload failed
        console.error(error)
      },
      () => {
        // upload success
        // add to users collection
        let image: Image = {
          imageId: id,
          uid: parentUserId, // id of the user who is creating this image
          name: upload.file.name, // use the filename e.g. dog.jpg as the name 
          filePath: storageFilePath,
          tinyUrl: `users/${parentUserId}/tiny_${id}.jpg`,
          smallUrl: `users/${parentUserId}/thumb_${id}.jpg`,
          mediumUrl: `users/${parentUserId}/medium_${id}.jpg`,
          largeUrl: `users/${parentUserId}/large_${id}.jpg`,
          default: false,
          lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
          creationDate: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        this.createUserImage(parentUserId, image).then(() => {
          // do something
        })	
        .catch(error =>{
          console.log('createUserImage ' + error);
        });
      }
    );
  }

  public update (parentUserId: string, imageId: string, data: any) {
    const imageRef = this.afs.collection(`users/${parentUserId}/images`).doc(imageId);
    data.lastUpdateDate = firebase.firestore.FieldValue.serverTimestamp();
    return imageRef.update(data);
  }

  public delete (parentUserId: string, imageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const imageRef = this.afs.collection(`users/${parentUserId}/images`).doc(imageId);
      
      imageRef.delete().then(() => {
        resolve();
      })
      .catch(error => {
        reject(error);
      });
    });
  }

  public getDownloadUrl (fileName): Observable<any> {
    let fileRef = firebase.storage().ref(fileName);

    return from(fileRef.getDownloadURL()).pipe(
      mergeMap(url => {
        return of(url);
      })
    );
  }
  
  public getImages (parentUserId: string, numberOfItems: number, key?: any, direction?: string): Observable<any[]> {
    let collectionName: string = `users/${parentUserId}/images`;

    if (direction){
      if (direction.toLowerCase() == 'asc'){
        if (key)
          return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'asc').startAt(key).limit(numberOfItems+1)).valueChanges();
        else
          return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'asc').limit(numberOfItems+1)).valueChanges();
      }
      else {
        if (key)
          return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').startAt(key).limit(numberOfItems+1)).valueChanges();
        else
          return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'desc').limit(numberOfItems+1)).valueChanges();
      }
    }
    else {
      if (key)
        return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'asc').startAt(key).limit(numberOfItems+1)).valueChanges();
      else
        return this.afs.collection<any>(collectionName, ref => ref.orderBy('creationDate', 'asc').limit(numberOfItems+1)).valueChanges();
    }
  }
}