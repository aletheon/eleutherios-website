import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'acceptable-use-policy',
  templateUrl: './acceptable.use.policy.component.html',
  styleUrls: ['./acceptable.use.policy.component.css']
})
export class AcceptableUsePolicyComponent implements OnInit {
  constructor(private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router) { }

  ngOnInit () {
    // initialize page here
  }
}