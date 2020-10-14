import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'layout-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  public date: Date = new Date();
  constructor() { }

  ngOnDestroy () {
  }

  ngOnInit () {
    
  }
}