import { Component, Inject } from '@angular/core';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'notification-snackbar',
  templateUrl: './notification.snackbar.component.html',
  styleUrls: ['./notification.snackbar.component.css']
})
export class NotificationSnackBar {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any, public snackBarRef: MatSnackBarRef<NotificationSnackBar>){}
  close(){
    this.snackBarRef.dismiss();
  }
}