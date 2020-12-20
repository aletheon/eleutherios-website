import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'terms-of-service',
  templateUrl: './terms.of.service.component.html',
  styleUrls: ['./terms.of.service.component.css']
})
export class TermsOfServiceComponent implements OnInit {
  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit () {
    // initialize page here
  }
}