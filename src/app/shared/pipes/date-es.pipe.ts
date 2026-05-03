import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateEs' })
export class DateEsPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const d = +parts[2], m = +parts[1] - 1, y = +parts[0];
    const date = new Date(y, m, d);
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${d}-${months[date.getMonth()]}-${y}`;
  }
}
