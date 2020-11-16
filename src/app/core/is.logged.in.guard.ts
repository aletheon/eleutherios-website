import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

import { Observable,  } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

@Injectable()
export class IsLoggedIn implements CanActivate {
  constructor(private afAuth: AngularFireAuth, private router: Router){}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
      return this.afAuth.user.pipe(
        take(1),
        map(user => !user),
        tap(NotLoggedIn => {
          if (!NotLoggedIn)
            this.router.navigate(['/anonymous/home']);
        })
      );  
  }
}
