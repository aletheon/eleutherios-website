import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'noTitle'})
export class NoTitlePipe implements PipeTransform {
  public transform(value: string): string {
    if (value == undefined)
      return 'No Title';
    else if (value.length == 0)
      return 'No Title';
    else
      return value;
  }
}