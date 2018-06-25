import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatDialog } from '@angular/material';
import { Subscription, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { CanComponentDeactivate } from '../shared/can-deactivate-guard.service';
import { WizardService } from './wizard/wizard.service';
import * as fromUi from './models/reducers';

import { MessageArchivedComponent } from '../shared/message-archived.component';
import { InfoDialogComponent } from '../shared/info-dialog.component';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    styleUrls: ['./ui.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class UiComponent implements OnInit, OnDestroy, CanComponentDeactivate {

    pending = false;

    subscriptions: Subscription[] = [];

    constructor(
        private router: Router,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService
    ) { }

    ngOnInit(): void {
        // Pending state.
        this.subscriptions.push(this.store.pipe(select(fromUi.pending)).subscribe((pending: boolean) => {
            this.pending = pending;
        }));
        // Error state.
        this.subscriptions.push(this.store.pipe(select(fromUi.error)).subscribe((error: string) => {
            if (error) {
                this.openSnackBar(error);
            }
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

    canDeactivate(): Observable<boolean> | boolean {
        return this.openDialog('Are you sure you want to quit the application?').pipe(
            tap((dialogResult: boolean) => {
                if (dialogResult) {
                    this.wizard.reset();
                }
            })
        );
    }

    reset(): void {
        this.openDialog('Are you sure you want to reset the application?').subscribe(
            (dialogResult: boolean) => {
                if (dialogResult) {
                    this.wizard.reset();
                }
            });
    }

    exit(): void {
        this.router.navigate(['/home']);
    }

    openSnackBar(message: string): void {
        this.snackBar.openFromComponent(MessageArchivedComponent, {
            data: message,
            duration: 4000,
            panelClass: ['error-snackbar']
        });
    }

    openDialog(data: string): Observable<boolean> {
        const dialogRef = this.dialog.open(InfoDialogComponent, {
            width: '250px',
            data: data,
            hasBackdrop: true,
            panelClass: 'info-dialog'
        });

        return dialogRef.afterClosed();
    }

}
