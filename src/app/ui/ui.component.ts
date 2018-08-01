import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatDialog } from '@angular/material';
import { Subscription, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { CanComponentDeactivate } from '../shared/can-deactivate-guard.service';
import { SchedulerService } from './wizard/scheduler.service';
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

    numerical = false;

    statistics = false;

    subscriptions: Subscription[] = [];

    constructor(
        private router: Router,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private store: Store<fromUi.UiState>,
        private scheduler: SchedulerService
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
        // Panels.
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            switch (currentStep) {
                case 0:
                    this.numerical = false;
                    this.statistics = false;
                    break;
                case 4:
                    this.numerical = true;
                    this.statistics = false;
                    break;
                case 5:
                    this.numerical = true;
                    this.statistics = true;
                    break;
            }
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

    canDeactivate(): Observable<boolean> | boolean {
        return this.openDialog('Are you sure you want to exit the simulation?').pipe(
            tap((dialogResult: boolean) => {
                if (dialogResult) {
                    this.scheduler.reset();
                }
            })
        );
    }

    reset(): void {
        this.openDialog('Are you sure you want to reset the simulation?').subscribe(
            (dialogResult: boolean) => {
                if (dialogResult) {
                    this.scheduler.reset();
                }
            });
    }

    exit(): void {
        this.router.navigate(['/home']);
    }

    openSnackBar(message: string): void {
        this.snackBar.openFromComponent(MessageArchivedComponent, {
            data: message,
            duration: 5000,
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
