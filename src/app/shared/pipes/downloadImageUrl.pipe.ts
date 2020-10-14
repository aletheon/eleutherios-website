import * as firebase from 'firebase';
import {Pipe, PipeTransform} from '@angular/core';
import * as _ from "lodash";
import { Observable, of, throwError, timer, defer } from 'rxjs';
import { mergeMap, finalize, catchError, retryWhen, switchMap } from 'rxjs/operators'

import { LocalCacheService } from '../services/local-cache.service';

@Pipe({
  name: 'downloadImageUrl'
})
export class DownloadImageUrlPipe implements PipeTransform {
  constructor(private cache: LocalCacheService){}

  private genericRetryStrategy = ({
    maxRetryAttempts = 3,
    scalingDuration = 1000,
    excludedStatusCodes = []
  }: {
    maxRetryAttempts?: number,
    scalingDuration?: number,
    excludedStatusCodes?: number[]
  } = {}) => (attempts: Observable<any>) => {
    return attempts.pipe(
      mergeMap((error, i) => {
        const retryAttempt = i + 1;
        // if maximum number of retries have been met
        // or response is a status code we don't wish to retry, throw error
        if (
          retryAttempt > maxRetryAttempts ||
          excludedStatusCodes.find(e => e === error.status)
        ) {
          return throwError(error);
        }
        console.log(
          `Attempt ${retryAttempt}: retrying in ${retryAttempt *
            scalingDuration}ms`
        );
        // retry after 1s, 2s, etc...
        return timer(retryAttempt * scalingDuration);
      }),
      finalize(() => console.log('We are done!'))
    );
  };

  public transform(url: string): Observable<any> {
    if (_.includes(url, '/assets/defaultTiny.jpg'))
      return of(url);
    if (_.includes(url, '/assets/defaultThumbnail.jpg'))
      return of(url);
    if (_.includes(url, '/assets/defaultLarge.jpg'))
      return of(url);

    let request$ = defer(() => firebase.storage().ref(url).getDownloadURL()).pipe(
      retryWhen(this.genericRetryStrategy({
        maxRetryAttempts: 25
      })),
      catchError(error => of(error))
    ).pipe(
      mergeMap(url => {
        return of(url);
      })
    );

    return this.cache.observable(url, request$).pipe(
      switchMap(result => {
        // use result
        return of(result);
      })
    );
  }
}