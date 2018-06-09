import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material';

import { LocationService } from '../../../location/location.service';

import { MessageArchivedComponent } from '../../message-archived.component';

@Component({
    selector: 'wizard-search-for-the-area',
    templateUrl: './search-for-the-area.component.html',
    styleUrls: ['./search-for-the-area.component.scss']
})
export class SearchForTheAreaComponent implements OnInit {

    @Input() formGroup: FormGroup;

    constructor(
        private location: LocationService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        //
    }

    search(address: string): void {
        if (!!address) {
            // Converts the address into geographic coordinates.
            this.location.codeAddress(address).forEach(
                (results: google.maps.GeocoderResult[]) => {
                    // TODO Update state
                })
                .then()
                .catch((error: google.maps.GeocoderStatus) => {
                    if (error === google.maps.GeocoderStatus.ZERO_RESULTS) {
                        this.openSnackBar('Zero results');
                    } else {
                        // INVALID_REQUEST, OVER_QUERY_LIMIT,REQUEST_DENIED, UNKNOWN_ERROR
                        this.openSnackBar('Invalid request');
                    }
                });
        }
    }

    getCurrentPosition(): void {
        if (navigator.geolocation) {
            this.location.getCurrentPosition().subscribe(
                (position: Position) => {
                    // TODO Update state
                },
                (error: PositionError) => {
                    if (error.code > 0) {
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                this.openSnackBar('Permission denied');
                                break;
                            case error.POSITION_UNAVAILABLE:
                                this.openSnackBar('Position unavailable');
                                break;
                            case error.TIMEOUT:
                                this.openSnackBar('Position timeout');
                                break;
                        }
                    }
                });

        } else {
            this.openSnackBar("Browser doesn't support geolocation");
        }
    }

    openSnackBar(message: string): void {
        this.snackBar.openFromComponent(MessageArchivedComponent, {
            data: message,
            duration: 6000,
            panelClass: ['error-snackbar']
        });
    }

}
