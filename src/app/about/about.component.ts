import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';

import { Observable, Subscription, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {
  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit () {
    // initialize page here
  }
}