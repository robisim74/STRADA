import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material';

@Component({
    selector: 'snack-bar',
    template: `
        <span>{{ data }}</span>
    `,
    styles: []
})
export class MessageArchivedComponent {

    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: any) { }

}
