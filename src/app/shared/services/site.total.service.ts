import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database'; 
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SiteTotalService {
  constructor(private db: AngularFireDatabase) {
  }
  
  public getTotal(id): Observable<any>{
    return this.db.object(`totals/${id}`)
      .snapshotChanges().pipe(
        map(res => {
          return res.payload.val();
        })
      );
  }
}