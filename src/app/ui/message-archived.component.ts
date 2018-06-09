import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material';

@Component({
    selector: 'snack-bar',
    template: `
        <span>message</span>
    `,
    styles: []
})
export class MessageArchivedComponent {

    constructor(
        @Inject(MAT_SNACK_BAR_DATA) public message: any,
        public snackBarRef: MatSnackBarRef<MessageArchivedComponent>,
        private router: Router
    ) {
        this.snackBarRef.afterDismissed().subscribe(() => {
            if (this.message == "Invalid request") {
                // TODO Reset data.
                this.router.navigate(['/home']);
            }
        });
    }

}
