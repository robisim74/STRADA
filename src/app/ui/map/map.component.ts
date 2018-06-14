import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';

import { Store, select } from '@ngrx/store';

import { MapStyle } from './map.style';
import * as fromUi from '../models/reducers';
import { Step } from '../models/wizard';
import { WizardState } from '../models/reducers/wizard.reducer';

@Component({
    selector: 'ui-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit, OnDestroy {

    // Center map. Required.
    center: google.maps.LatLng;

    // The initial map zoom level. Required.
    zoom: number;

    disableDefaultUI: boolean;
    disableDoubleClickZoom: boolean;
    mapTypeId: google.maps.MapTypeId;
    maxZoom: number;
    minZoom: number;
    gestureHandling: string;
    styles: google.maps.MapTypeStyle[];

    subscriptions: Subscription[] = [];

    constructor(
        private store: Store<fromUi.UiState>
    ) {
        // Map options.
        this.disableDefaultUI = true;
        this.disableDoubleClickZoom = false;
        this.mapTypeId = google.maps.MapTypeId.ROADMAP;
        this.maxZoom = 18;
        this.minZoom = 4;
        this.gestureHandling = 'cooperative';
        this.styles = MapStyle;
    }

    ngOnInit(): void {
        this.center = new google.maps.LatLng(41.910943, 12.476358);
        this.zoom = 4;

        // Wizard state.
        this.subscriptions.push(this.store.pipe(
            select(fromUi.wizardState)
        ).subscribe((state: WizardState) => {
            switch (state.currentStep) {
                case 0:
                    if (state.steps[0]) {
                        this.center = state.steps[0].data.center;
                        this.zoom = 17;
                    }
                    break;
                case 1:
                    if (!state.steps[1]) {
                        // TODO Show rectangle
                    }
                    break;
            }
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

}
