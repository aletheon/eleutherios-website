import { Injectable } from "@angular/core";
import { LocalForageService } from 'ngx-localforage';
import { Observable, of } from "rxjs";
import { isEmpty, isString, isNumber, isDate } from 'lodash';
import { mergeMap, map } from 'rxjs/operators';

@Injectable()
export class LocalCacheService {

  /**
   * Default expiry in seconds
   *
   * @type {number}
   */
  defaultExpires: number = 86400; //24Hrs
  constructor(private localforage: LocalForageService) {}

  /**
   * Cache or use result from observable
   *
   * If cache key does not exist or is expired, observable supplied in argument is returned and result cached
   *
   * @param key
   * @param observable
   * @param expires
   * @returns {Observable<T>}
   */
  public observable<T>(key: string, observable: Observable<T>, expires:number = this.defaultExpires): Observable<T> {
    //First fetch the item from localstorage (even though it may not exist)
    return this.localforage.getItem(key).pipe(
			//If the cached value has expired, nullify it, otherwise pass it through
			map((val: CacheStorageRecord) => {
				if(val){
					return (new Date(val.expires)).getTime() > Date.now() ? val : null;
				}
				return null;
			})
    ).pipe(
			mergeMap((val: CacheStorageRecord | null) => {
				if (!isEmpty(val)) {
					return of(val.value);
				} else {
					return mergeMap((val:any) => this.value(key, val, expires)); //The result may have 'expires' explicitly set
				}
			})
		)
		//At this point, if we encounter a null value, either it doesnt exist in the cache or it has expired.
		//If it doesnt exist, simply return the observable that has been passed in, caching its value as it passes through
  }

  /**
   * Cache supplied value until expiry
   *
   * @param key
   * @param value
   * @param expires
   * @returns {Observable<T>}
   */
  value<T>(key:string, value:T, expires:number|string|Date = this.defaultExpires):Observable<T>{
    let _expires:Date = this.sanitizeAndGenerateDateExpiry(expires);

    return this.localforage.setItem(key, {
      expires: _expires,
      value: value
    }).pipe(
			map(val => val.value)
		);
  }

  /**
   *
   * @param key
   * @returns {Observable<void>}
   */
  expire(key:string):Observable<void>{
    return this.localforage.removeItem(key);
  }

  /**
   *
   * @param expires
   * @returns {Date}
   */
  private sanitizeAndGenerateDateExpiry(expires:string|number|Date):Date{
    let expiryDate:Date = this.expiryToDate(expires);

    //Dont allow expiry dates in the past
    if(expiryDate.getTime() <= Date.now()){
      return new Date(Date.now() + this.defaultExpires);
    }

    return expiryDate;
  }

  /**
   *
   * @param expires
   * @returns {Date}
   */
  private expiryToDate(expires:number|string|Date):Date{
    if(isNumber(expires)){
      return new Date(Date.now() + Math.abs(expires)*1000);
    }
    if(isString(expires)){
      return new Date(expires);
    }
    if(isDate(expires)){
      return expires;
    }

    return new Date();
  }
}

/**
 * Cache storage record interface
 */
interface CacheStorageRecord {
  expires: Date,
  value: any
}