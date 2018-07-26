import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { WizardService } from '../wizard.service';
import { LocationService } from '../../../location/location.service';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-search-for-the-area',
    templateUrl: './search-for-the-area.component.html',
    styleUrls: ['./search-for-the-area.component.scss']
})
export class SearchForTheAreaComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor(
        private wizard: WizardService,
        private location: LocationService
    ) {
        super();
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        // Updates location service data on value changes.
        this.subscriptions.push(this.formGroup.get('center').valueChanges.subscribe(
            (center: google.maps.LatLngLiteral) => {
                this.location.setLatLng(center);
            }
        ));
    }

    receiveActions(): void {
        //
    }

    sendActions(): void {
        //
    }

    search(address: string): void {
        if (!!address) {
            // Updates pending state.
            this.wizard.putOnHold('Searching address');
            // Converts the address into geographic coordinates.
            this.location.codeAddress(address).forEach(
                (results: google.maps.GeocoderResult[]) => {
                    this.formGroup.get('center').setValue({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                    // Updates step state.
                    this.wizard.updateStep(this.formGroup.value, this.index);
                })
                .then()
                .catch((error: google.maps.GeocoderStatus) => {
                    if (error === google.maps.GeocoderStatus.ZERO_RESULTS) {
                        // Updates error state.
                        this.wizard.putInError('Zero results');
                    } else {
                        // INVALID_REQUEST, OVER_QUERY_LIMIT, REQUEST_DENIED, UNKNOWN_ERROR
                        // Updates error state.
                        this.wizard.putInError('Invalid request');
                    }
                });
        }
    }

    getCurrentPosition(): void {
        if (navigator.geolocation) {
            // Updates pending state.
            this.wizard.putOnHold('Getting position');
            this.location.getCurrentPosition().subscribe(
                (position: Position) => {
                    this.formGroup.get('center').setValue({ lat: position.coords.latitude, lng: position.coords.longitude });
                    // Updates step state.
                    this.wizard.updateStep(this.formGroup.value, this.index);
                },
                (error: PositionError) => {
                    if (error.code > 0) {
                        let message: string;
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                message = 'Permission denied';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                message = 'Position unavailable';
                                break;
                            case error.TIMEOUT:
                                message = 'Position timeout';
                                break;
                        }
                        // Updates error state.
                        this.wizard.putInError(message);
                    }
                });

        } else {
            // Updates error state.
            this.wizard.putInError("Browser doesn't support geolocation");
        }
    }

}
