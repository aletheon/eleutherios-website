import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'back',
  templateUrl: './back.component.html',
  styleUrls: ['./back.component.css']
})
export class BackComponent implements OnInit {

  constructor(private _location: Location) { }

  ngOnInit () {
  }

  public navigateBack () {
    this._location.back();
  } 
}