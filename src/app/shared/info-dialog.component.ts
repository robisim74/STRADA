import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
    selector: 'info-dialog',
    template: `
        <h2 mat-dialog-title>Info</h2>
        <mat-dialog-content>
            {{ data }}
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button type="button" mat-raised-button [mat-dialog-close]="false">No</button>
            <button type="button" mat-raised-button color="accent" [mat-dialog-close]="true">Yes</button>
        </mat-dialog-actions>
    `,
    styles: []
})
export class InfoDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<InfoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

}
