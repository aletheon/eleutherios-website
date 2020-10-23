import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormGroup, FormControl, FormBuilder, Validators } from '@angular/forms';
import {
  SiteTotalService,
  UserServiceTagService,
  UserForumRegistrantService,
  UserServiceService,
  UserTagService,
  UserForumService,
  UserImageService,
  UserServiceImageService,
  UserForumImageService,
  TagService,
  Image,
  Registrant,
  Service,
  Tag,
  NoTitlePipe
} from '../../../shared';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelect } from '@angular/material/select';
import { NotificationSnackBar } from '../../../shared/components/notification.snackbar.component';

import { Observable, Subscription, BehaviorSubject, of, combineLatest, zip, from } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import * as firebase from 'firebase/app';
import * as _ from "lodash";

@Component({
  selector: 'user-forum-service-new',
  templateUrl: './user.forum.service.new.component.html',
  styleUrls: ['./user.forum.service.new.component.css']
})
export class UserForumServiceNewComponent implements OnInit, OnDestroy, AfterViewInit  {
  @ViewChild('main', { static: false }) titleRef: ElementRef;
  private _loading = new BehaviorSubject(false);
  private _forumSubscription: Subscription;
  private _serviceSubscription: Subscription;
  private _searchServiceCtrlSubscription: Subscription;
  private _defaultForumImageSubscription: Subscription;
  private _defaultServiceImageSubscription: Subscription;
  private _totalSubscription: Subscription;
  private _defaultRegistrantSubscription: Subscription;
  private _forumCount = new BehaviorSubject(0);
  private _tagCount = new BehaviorSubject(0);
  private _imageCount = new BehaviorSubject(0);
  private _settingDefaultServiceImage: boolean = false;
  private _addingTag = new BehaviorSubject(false);
  private _userId: string = '';
  private _forumId: string = '';
  private _tempForum: any;

  public serviceGroup: FormGroup;
  public forum: Observable<any>; // the forum that this registrant will be added to
  public registrant: Observable<any>; // this will be the new registrant that gets created
  public service: Observable<any>; // the service that is being created
  public forumCount: Observable<number> = this._forumCount.asObservable();
  public tagCount: Observable<number> = this._tagCount.asObservable();
  public imageCount: Observable<number> = this._imageCount.asObservable();
  public loading: Observable<boolean> = this._loading.asObservable();
  public matAutoCompleteServiceTags: Observable<any[]>;
  public defaultRegistrant: any;
  public defaultForumImage: Observable<any>;
  public defaultServiceImage: Observable<any>;
  public types: string[] = ['Public', 'Private'];
  public serviceTags: Observable<any[]>;
  public serviceImages: Observable<any[]>;
  public tagServiceCtrl: FormControl;
  public images: Observable<any[]>;
  
  constructor(public auth: AuthService,
    private route: ActivatedRoute,
    private siteTotalService: SiteTotalService,
    private userServiceTagService: UserServiceTagService,
    private userForumImageService: UserForumImageService,
    private userServiceImageService: UserServiceImageService,
    private userForumRegistrantService: UserForumRegistrantService, 
    private userTagService: UserTagService,
    private tagService: TagService,
    private userServiceService: UserServiceService,
    private userForumService: UserForumService,
    private userImageService: UserImageService,
    private fb: FormBuilder,
    private router: Router,
    private snackbar: MatSnackBar) {
      this.tagServiceCtrl = new FormControl();

      // searchTag mat subscription
      this.matAutoCompleteServiceTags = this.tagServiceCtrl.valueChanges.pipe(
        startWith(''),
        switchMap(searchTerm => 
          this.tagService.search(searchTerm)
        )
      );
  }

  setDefaultServiceImage (serviceImage) {
    if (this._settingDefaultServiceImage == false){
      this._settingDefaultServiceImage = true;

      // get old default image
      const tempServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.auth.uid, this.serviceGroup.get('serviceId').value)
        .subscribe(defaultServiceImages => {
          if (defaultServiceImages && defaultServiceImages.length > 0){
            if (defaultServiceImages[0].imageId != serviceImage.imageId){
              // set old default image to false
              defaultServiceImages[0].default = false;

              this.userServiceImageService.update(this.auth.uid, this.serviceGroup.get('serviceId').value, defaultServiceImages[0].imageId, defaultServiceImages[0]).then(()=> {               
                // set new service image to true
                serviceImage.default = true;

                this.userServiceImageService.update(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
                  this._settingDefaultServiceImage = false;
                })
                .catch(error => {
                  this._settingDefaultServiceImage = false;
                });
              });
            }
            else {
              // set new service image default to its opposite value
              serviceImage.default = !serviceImage.default;

              this.userServiceImageService.update(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
                this._settingDefaultServiceImage = false;
              })
              .catch(error => {
                this._settingDefaultServiceImage = false;
              });
            }
          }
          else {
            // set new service image default to its opposite
            serviceImage.default = !serviceImage.default;

            this.userServiceImageService.update(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceImage.imageId, serviceImage).then(() => {
              this._settingDefaultServiceImage = false;
            })
            .catch(error => {
              this._settingDefaultServiceImage = false;
            });
          }
          tempServiceImageSubscription.unsubscribe();
        }
      );
    }
  }

  addImage (image) {
    if (this.serviceGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');

      setTimeout(() => {
        for (let i in this.serviceGroup.controls) {
          this.serviceGroup.controls[i].markAsTouched();
        }
        this.titleRef.nativeElement.focus();
      }, 500);
    }
    else {
      this.userServiceImageService.exists(this.auth.uid, this.serviceGroup.get('serviceId').value, image.imageId).then(exists => {
        if (!exists){
          image.default = false;
          this.userServiceImageService.create(this.auth.uid, this.serviceGroup.get('serviceId').value, image);
        }
        else console.log('image already exists in service');
      });
    }
  }

  getDefaultForumImage () {
    this._defaultForumImageSubscription = this.userForumImageService.getDefaultForumImages(this._userId, this._forumId).pipe(
      switchMap(forumImages => {
        if (forumImages && forumImages.length > 0){
          let getDownloadUrl$: Observable<any>;

          if (forumImages[0].tinyUrl)
            getDownloadUrl$ = from(firebase.storage().ref(forumImages[0].tinyUrl).getDownloadURL());

          return combineLatest([getDownloadUrl$]).pipe(
            switchMap(results => {
              const [downloadUrl] = results;
              
              if (downloadUrl)
                forumImages[0].url = downloadUrl;
              else
                forumImages[0].url = '../../../assets/defaultTiny.jpg';

              return of(forumImages[0]);
            })
          );
        }
        else return of(null);
      })
    )
    .subscribe(forumImage => {
      if (forumImage)
        this.defaultForumImage = of(forumImage);
      else {
        let tempImage = {
          url: '../../../assets/defaultTiny.jpg'
        };
        this.defaultForumImage = of(tempImage);
      }
    });
  }

  getDefaultServiceImage () {
    // default service image
    this._defaultServiceImageSubscription = this.userServiceImageService.getDefaultServiceImages(this.serviceGroup.get('uid').value, this.serviceGroup.get('serviceId').value).pipe(
      switchMap(serviceImages => {
        if (serviceImages && serviceImages.length > 0){
          let getDownloadUrl$: Observable<any>;

          if (serviceImages[0].smallUrl)
            getDownloadUrl$ = from(firebase.storage().ref(serviceImages[0].smallUrl).getDownloadURL());

          return combineLatest([getDownloadUrl$]).pipe(
            switchMap(results => {
              const [downloadUrl] = results;
              
              if (downloadUrl)
                serviceImages[0].url = downloadUrl;
              else
                serviceImages[0].url = '../../../assets/defaultThumbnail.jpg';

              return of(serviceImages[0]);
            })
          );
        }
        else return of(null);
      })
    )
    .subscribe(serviceImage => {
      if (serviceImage)
        this.defaultServiceImage = of(serviceImage);
      else {
        let tempImage = {
          url: '../../../assets/defaultThumbnail.jpg'
        };
        this.defaultServiceImage = of(tempImage);
      }
    });
  }

  removeServiceImage (serviceImage) {
    this.userServiceImageService.exists(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceImage.imageId).then(exists => {
      if (exists)
        this.userServiceImageService.delete(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceImage.imageId);
    });
  }

  removeServiceTag (serviceTag) {
    this.userServiceTagService.exists(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceTag.tagId).then(exists => {
      if (exists)
        this.userServiceTagService.delete(this.auth.uid, this.serviceGroup.get('serviceId').value, serviceTag.tagId);
    });
  }

  autoServiceTagsDisplayFn (tag: any): string {
    return tag? tag.tag: tag;
  }

  serviceTagsSelectionChange (tag: any) {
    if (this.serviceGroup.get('title').value.length > 0){
      this.userServiceTagService.exists(this.auth.uid, this.serviceGroup.get('serviceId').value, tag.tagId).then(exists => {
        if (!exists){
          this.userServiceTagService.getTagCount(this.auth.uid, this.serviceGroup.get('serviceId').value).then(count => {
            if (count < 5){
              if (this._addingTag.getValue() == false){
                this._addingTag.next(true);
  
                this.userServiceTagService.create(this.auth.uid, this.serviceGroup.get('serviceId').value, tag)
                  .then(() => {
                    // delay to prevent user adding multiple tags simultaneously
                    setTimeout(() => {
                      this._addingTag.next(false);
                    }, 1000);
                  }
                )
                .catch(error => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: error.message,
                      panelClass: ['red-snackbar']
                    }
                  );
                });
              }
            }
            else {
              const snackBarRef =this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: 'This is the alpha version of eleutherios and is limited to only 5 tags each service',
                  panelClass: ['red-snackbar']
                }
              );
            }
          });
        }
      });
    }
  }

  ngOnDestroy () {
    if (this._forumSubscription)
      this._forumSubscription.unsubscribe();

    if (this._serviceSubscription)
      this._serviceSubscription.unsubscribe();

    if (this._defaultRegistrantSubscription)
      this._defaultRegistrantSubscription.unsubscribe();

    if (this._defaultForumImageSubscription)
      this._defaultForumImageSubscription.unsubscribe();

    if (this._defaultServiceImageSubscription)
      this._defaultServiceImageSubscription.unsubscribe();

    if (this._searchServiceCtrlSubscription)
      this._searchServiceCtrlSubscription.unsubscribe();

    if (this._totalSubscription)
      this._totalSubscription.unsubscribe();
  }

  trackServiceTags (index, serviceTag) { return serviceTag.tagId; }
  trackServiceImages (index, serviceImage) { return serviceImage.imageId; }
  trackImages (index, image) { return image.imageId; }

  ngAfterViewInit () {
    const that = this;
    let intervalId = setInterval(() => {
      if (that._loading.getValue() == false) {
        clearInterval(intervalId);

        // set focus
        for (let i in that.serviceGroup.controls) {
          that.serviceGroup.controls[i].markAsTouched();
        }

        if (that.titleRef)
          that.titleRef.nativeElement.focus();
      }
    }, 100);
  }

  ngOnInit () {
    this._loading.next(true);

    this.route.queryParams.subscribe((params: Params) => {
      this._userId = params['userId'];
      this._forumId = params['forumId'];

      const newService: Service = {
        serviceId: '',
        uid: this.auth.uid,
        type: 'Private',
        title: '',
        title_lowercase: '',
        description: '',
        website: '',
        default: false,
        indexed: false,
        rate: 0,
        paymentType: 'free',
        amount: 0,
        includeDescriptionInDetailPage: false,
        includeImagesInDetailPage: false,
        includeTagsInDetailPage: false,
        creationDate: firebase.firestore.FieldValue.serverTimestamp(),
        lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp()
      };

      this.userForumService.getForumFromPromise(this._userId, this._forumId)
        .then(forum => {
          if (forum){
            this._tempForum = forum;

            if (forum.title.length > 0){
              this.forum = this.userForumService.getForum(this._userId, this._forumId);
              this.service = this.userServiceService.create(this.auth.uid, newService); 
              this.initForm();
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 8000,
                  data: `Forum is missing a title`,
                  panelClass: ['red-snackbar']
                }
              );

              if (forum.type == 'Private')
                this.router.navigate(['/user/forum/detail'], { queryParams: { userId: this._userId, forumId: this._forumId } });
              else
                this.router.navigate(['/forum/detail'], { queryParams: { forumId: this._forumId } });
            }
          }
          else {
            const snackBarRef = this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: 'Forum does not exist or was recently removed',
                panelClass: ['red-snackbar']
              }
            );
            this.router.navigate(['/']);
          }
        }
      )
      .catch(error => {
        console.error(error);
      });
    });
  }

  private initForm () {
    const that = this;

    this.serviceGroup = this.fb.group({
      serviceId:                      [''],
      uid:                            [''],
      type:                           [''],
      title:                          ['', Validators.required ],
      title_lowercase:                [''],
      description:                    [''],
      website:                        [''],
      default:                        [''],
      indexed:                        [''],
      rate:                           [''],
      includeDescriptionInDetailPage: [''],
      includeImagesInDetailPage:      [''],
      includeTagsInDetailPage:        [''],
      lastUpdateDate:                 [''],
      creationDate:                   ['']
    });

    this._forumSubscription = this.forum
      .subscribe(forum => {
        if (forum)
          this._tempForum = forum;
      }
    );

    this._serviceSubscription = this.service
      .subscribe(service => {
        if (service){
          this.serviceGroup.patchValue(service);
        }
      }
    );

    const runForumOnceSubscription = this.forum.subscribe(forum => {  
      if (forum){
        let load = async function(){
          try {
            // get default forum image
            that.getDefaultForumImage();
          }
          catch (error) {
            throw error;
          }
        }

        // call load
        load().then(() => {
          runForumOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });

    const runServiceOnceSubscription = this.service.subscribe(service => {
      if (service){
        let load = async function(){
          try {
            // service totals
            that._totalSubscription = that.siteTotalService.getTotal(service.serviceId)
              .subscribe(total => {
                if (total) {
                  if (total.forumCount == 0)
                    that._forumCount.next(-1);
                  else
                    that._forumCount.next(total.forumCount);

                  if (total.tagCount == 0)
                    that._tagCount.next(-1);
                  else
                    that._tagCount.next(total.tagCount);
                    
                  if (total.imageCount == 0)
                    that._imageCount.next(-1);
                  else
                    that._imageCount.next(total.imageCount);
                }
              });

            that._defaultRegistrantSubscription = that.userForumRegistrantService.getDefaultUserRegistrant(that._userId, that._forumId, that.auth.uid)
              .subscribe(registrants => {
                if (registrants && registrants.length > 0)
                  that.defaultRegistrant = registrants[0];
                else {
                  that.defaultRegistrant = null;
                }
              }
            );

            // get default service image
            that.getDefaultServiceImage();

            // service tags
            that.serviceTags = that.userServiceTagService.getTags(that.auth.uid, service.serviceId);

            // images
            that.images = that.userImageService.getImages(that.auth.uid, 1000, null).pipe(
              switchMap(images => {
                if (images && images.length > 0){
                  let observables = images.map(image => {
                    let getDownloadUrl$: Observable<any>;
        
                    if (image.smallUrl)
                      getDownloadUrl$ = from(firebase.storage().ref(image.smallUrl).getDownloadURL());
        
                    return combineLatest([getDownloadUrl$]).pipe(
                      switchMap(results => {
                        const [downloadUrl] = results;
                        
                        if (downloadUrl)
                          image.url = downloadUrl;
                        else
                          image.url = '../../../assets/defaultThumbnail.jpg';
          
                        return of(image);
                      })
                    );
                  });
            
                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      return images[i];
                    });
                  });
                }
                else return of([]);
              })
            );

            // service images
            that.serviceImages = that.userServiceImageService.getServiceImages(that.auth.uid, service.serviceId, 1000, null).pipe(
              switchMap(serviceImages => {
                if (serviceImages && serviceImages.length > 0){
                  let observables = serviceImages.map(serviceImage => {
                    let getDownloadUrl$: Observable<any>;
        
                    if (serviceImage.smallUrl)
                      getDownloadUrl$ = from(firebase.storage().ref(serviceImage.smallUrl).getDownloadURL());
        
                    return combineLatest([getDownloadUrl$]).pipe(
                      switchMap(results => {
                        const [downloadUrl] = results;
                        
                        if (downloadUrl)
                          serviceImage.url = downloadUrl;
                        else
                          serviceImage.url = '../../../assets/defaultThumbnail.jpg';
          
                        return of(serviceImage);
                      })
                    );
                  });
            
                  return zip(...observables, (...results) => {
                    return results.map((result, i) => {
                      return serviceImages[i];
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
          runServiceOnceSubscription.unsubscribe();
        })
        .catch((error) =>{
          console.log('initForm ' + error);
        });
      }
    });
  }

  createTag () {
    if (this.tagServiceCtrl.value.length > 0){
      let valueToSearch = this.tagServiceCtrl.value.replace(/\s\s+/g,' ').toLowerCase();

      if (valueToSearch.length > 0){
        if (valueToSearch.length <= 50){
          if (/^[A-Za-z0-9\s]*$/.test(valueToSearch)){
            this.tagService.exists(valueToSearch).then(result => {
              if (!result){
                const newTag: Tag = {
                  tagId: '',
                  uid: this.auth.uid,
                  tag: valueToSearch,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                  creationDate: firebase.firestore.FieldValue.serverTimestamp()
                };
      
                const userTag = this.userTagService.create(this.auth.uid, newTag).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: `Created new tag '${valueToSearch}'`,
                      panelClass: ['green-snackbar']
                    }
                  );
                });
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `The tag '${valueToSearch}' already exists`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            });
          }
          else {
            const snackBarRef =this.snackbar.openFromComponent(
              NotificationSnackBar,
              {
                duration: 8000,
                data: `Invalid characters we're located in the tag field, valid characters include [A-Za-z0-9]`,
                panelClass: ['red-snackbar']
              }
            );
          }
        }
        else {
          const snackBarRef =this.snackbar.openFromComponent(
            NotificationSnackBar,
            {
              duration: 8000,
              data: 'This is the alpha version of eleutherios and is limited to only 50 characters per tag',
              panelClass: ['red-snackbar']
            }
          );
        }
      }
    }
  }

  saveChanges () {
    if (this.serviceGroup.status != 'VALID') {
      console.log('service is not valid, cannot save to database');
      return;
    }

    let tempTitle = this.serviceGroup.get('title').value.replace(/\s\s+/g,' ');

    if (tempTitle.length <= 100){
      if (/^[A-Za-z0-9\s]*$/.test(tempTitle)){
        const data = {
          serviceId: this.serviceGroup.get('serviceId').value,
          uid: this.serviceGroup.get('uid').value,
          type: this.serviceGroup.get('type').value,
          title: tempTitle,
          title_lowercase: tempTitle.toLowerCase(),
          description: this.serviceGroup.get('description').value.trim(),
          website: this.serviceGroup.get('website').value.trim(),
          default: this.serviceGroup.get('default').value,
          indexed: this.serviceGroup.get('indexed').value != undefined ? this.serviceGroup.get('indexed').value : false,
          includeDescriptionInDetailPage: this.serviceGroup.get('includeDescriptionInDetailPage').value,
          includeImagesInDetailPage: this.serviceGroup.get('includeImagesInDetailPage').value,
          includeTagsInDetailPage: this.serviceGroup.get('includeTagsInDetailPage').value,
          lastUpdateDate: this.serviceGroup.get('lastUpdateDate').value,
          creationDate: this.serviceGroup.get('creationDate').value
        };
    
        this.userServiceService.update(this.auth.uid, this.serviceGroup.get('serviceId').value, data).then(() => {
          // get or create the registrant if it doesn't exist
          // this will only be done once
          this.userForumRegistrantService.serviceIsServingInForum(this._userId, this._forumId, this.serviceGroup.get('serviceId').value).then(isServing => {
            if (isServing == false) {
              if (this.serviceGroup.get('title').value.length > 0){
                const newRegistrant: Registrant = {
                  registrantId: '',
                  parentId: this.defaultRegistrant ? this.defaultRegistrant.registrantId : '',
                  serviceId: this.serviceGroup.get('serviceId').value,
                  uid: data.uid,
                  forumId: this._userId,
                  forumUid: this._forumId,
                  default: this.defaultRegistrant ? false : true,
                  indexed: this.serviceGroup.get('indexed').value,
                  lastUpdateDate: firebase.firestore.FieldValue.serverTimestamp(),
                  creationDate: firebase.firestore.FieldValue.serverTimestamp()
                };
      
                this.userForumRegistrantService.create(this._userId, this._forumId, newRegistrant).then(() => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 5000,
                      data: 'Service saved',
                      panelClass: ['green-snackbar']
                    }
                  );
                })
                .catch(error => {
                  const snackBarRef = this.snackbar.openFromComponent(
                    NotificationSnackBar,
                    {
                      duration: 8000,
                      data: error.message,
                      panelClass: ['red-snackbar']
                    }
                  );
                });
              }
              else {
                const snackBarRef = this.snackbar.openFromComponent(
                  NotificationSnackBar,
                  {
                    duration: 8000,
                    data: `Service is missing a title`,
                    panelClass: ['red-snackbar']
                  }
                );
              }
            }
            else {
              const snackBarRef = this.snackbar.openFromComponent(
                NotificationSnackBar,
                {
                  duration: 5000,
                  data: 'Service saved',
                  panelClass: ['green-snackbar']
                }
              );
            }
          })
          .catch(error => {
            console.log(error);
          });
        })
        .catch(error => {
          console.log(error);
        });
      }
      else {
        const snackBarRef =this.snackbar.openFromComponent(
          NotificationSnackBar,
          {
            duration: 8000,
            data: `Invalid characters we're located in the title field, valid characters include [A-Za-z0-9]`,
            panelClass: ['red-snackbar']
          }
        );
      }
    }
    else {
      const snackBarRef =this.snackbar.openFromComponent(
        NotificationSnackBar,
        {
          duration: 8000,
          data: 'This is the alpha version of eleutherios and is limited to only 100 characters per title',
          panelClass: ['red-snackbar']
        }
      );
    }
  }

  cancel () {
    this.userServiceService.delete(this.auth.uid, this.serviceGroup.get('serviceId').value).then(() => {
      this.router.navigate(['/']);
    });
  }
}