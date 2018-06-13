import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { Subscription } from 'rxjs';

import { Store, select } from '@ngrx/store';

import * as fromUi from './models/reducers';

import { MessageArchivedComponent } from '../shared/message-archived.component';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    styleUrls: ['./ui.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class UiComponent implements OnInit, OnDestroy {

    pending = false;

    subscriptions: Subscription[] = [];

    constructor(
        private snackBar: MatSnackBar,
        private store: Store<fromUi.UiState>
    ) { }

    ngOnInit(): void {
        // Pending state.
        this.subscriptions.push(this.store.pipe(
            select(fromUi.pending)
        ).subscribe((pending: boolean) => {
            this.pending = pending;
        }));
        // Error state.
        this.subscriptions.push(this.store.pipe(
            select(fromUi.error)
        ).subscribe((error: any) => {
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

    openSnackBar(message: string): void {
        this.snackBar.openFromComponent(MessageArchivedComponent, {
            data: message,
            duration: 6000,
            panelClass: ['error-snackbar']
        });
    }

}
