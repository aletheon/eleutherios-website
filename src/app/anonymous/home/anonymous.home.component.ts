import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import {
  AnonymousForumService,
  AnonymousServiceService,
  UserForumImageService,
  UserServiceImageService,
  UserForumTagService,
  UserServiceTagService,
  NoTitlePipe,
  DownloadImageUrlPipe
} from '../../shared';

import { Observable, BehaviorSubject, of, combineLatest, zip } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as _ from "lodash";

@Component({
  selector: 'app-anonymous-home',
  templateUrl: './anonymous.home.component.html',
  styleUrls: ['./anonymous.home.component.css']
})
export class AnonymousHomeComponent implements OnDestroy, OnInit {
  private _loading = new BehaviorSubject(false);

  public publicForums: Observable<any[]>;
  public publicServices: Observable<any[]>;
  public publicForumsNumberOfItems: number = 100;
  public publicServicesNumberOfItems: number = 100;
  public loading: Observable<boolean> = this._loading.asObservable();

  constructor(private auth: AuthService,
    private anonymousForumService: AnonymousForumService,
    private anonymousServiceService: AnonymousServiceService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumTagService: UserForumTagService,
    private userServiceTagService: UserServiceTagService,
    private router: Router) {
  }

  ngOnDestroy () {
    // do something
  }

  trackPublicForums (index, forum) { return forum.forumId; }
  trackPublicServices (index, service) { return service.serviceId; }

  ngOnInit () {
    // redirect user if they are already logged in
    if (this.auth.uid && this.auth.uid.length > 0)
      this.router.navigate(['/']);

    const that = this;
    this._loading.next(true);
    let load = async function(){
      try {
        // public forums
        that.publicForums = that.anonymousForumService.getForums(that.publicForumsNumberOfItems, '', [], true, true).pipe(
          switchMap(forums => {
            if (forums && forums.length > 0){
              let observables = forums.map(forum => {
                if (forum){
                  let getDefaultForumImage$ = that.userForumImageService.getDefaultForumImages(forum.uid, forum.forumId).pipe(
                    switchMap(forumImages => {
                      if (forumImages && forumImages.length > 0)
                        return of(forumImages[0]);
                      else
                        return of(null);
                    })
                  );
                  let getForumTags$ = that.userForumTagService.getTags(forum.uid, forum.forumId);

                  return combineLatest([getDefaultForumImage$, getForumTags$]).pipe(
                    switchMap(results => {
                      const [defaultForumImage, forumTags] = results;
        
                      if (defaultForumImage)
                        forum.defaultForumImage = of(defaultForumImage);
                      else {
                        let tempImage = {
                          smallUrl: '../../../assets/defaultThumbnail.jpg',
                          name: 'No image'
                        };
                        forum.defaultForumImage = of(tempImage);
                      }

                      if (forumTags)
                        forum.forumTags = of(forumTags);
                      else
                        forum.forumTags = of([]);
                        
                      return of(forum);
                    })
                  );
                }
                else return of(null);
              });
        
              return zip(...observables, (...results) => {
                return results.map((result, i) => {
                  return forums[i];
                });
              });
            }
            else return of([]);
          })
        );

        // public services
        that.publicServices = that.anonymousServiceService.getServices(that.publicServicesNumberOfItems, '', [], true, true).pipe(
          switchMap(services => {
            if (services && services.length > 0){
              let observables = services.map(service => {
                if (service){
                  let getDefaultServiceImage$ = that.userServiceImageService.getDefaultServiceImages(service.uid, service.serviceId).pipe(
                    switchMap(serviceImages => {
                      if (serviceImages && serviceImages.length > 0)
                        return of(serviceImages[0]);
                      else
                        return of(null);
                    })
                  );
                  let getServiceTags$ = that.userServiceTagService.getTags(service.uid, service.serviceId);

                  return combineLatest([getDefaultServiceImage$, getServiceTags$]).pipe(
                    switchMap(results => {
                      const [defaultServiceImage, serviceTags] = results;
                      
                      if (defaultServiceImage)
                        service.defaultServiceImage = of(defaultServiceImage);
                      else {
                        let tempImage = {
                          smallUrl: '../../../assets/defaultThumbnail.jpg',
                          name: 'No image'
                        };
                        service.defaultServiceImage = of(tempImage);
                      }

                      if (serviceTags)
                        service.serviceTags = of(serviceTags);
                      else
                        service.serviceTags = of([]);

                      return of(service);
                    })
                  );
                }
                else return of(null);
              });
        
              return zip(...observables, (...results: any[]) => {
                return results.map((result, i) => {
                  return services[i];
                });
              });
            }
            else return of([]);
          }) 
        );
      }
      catch (error) {
        throw error;
      }
    }

    // call load
    load().then(() => {
      this._loading.next(false);
    })
    .catch((error) =>{
      this.router.navigate(['/login']);
    });
  }
}