import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard/wizard.service';
import { MapService } from './map.service';
import { MapStyle } from './map.style';
import * as fromUi from '../models/reducers';
import { Step } from '../models/wizard';
import { WizardState } from '../models/reducers/wizard.reducer';
import { uiConfig } from '../ui-config';

@Component({
    selector: 'ui-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit, OnDestroy {

    // Center map. Required.
    center: google.maps.LatLngLiteral;

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
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private map: MapService
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
        this.center = { lat: 41.910943, lng: 12.476358 };
        this.zoom = 4;

        // Wizard state.
        this.subscriptions.push(this.store.pipe(select(fromUi.wizardState)).subscribe((state: WizardState) => {
            if (!state.error) {
                switch (state.currentStep) {
                    case 0:
                        if (state.steps[0]) {
                            this.center = state.steps[0].data.center;
                            this.zoom = 16;
                        }
                        break;
                    case 1:
                        if (!state.steps[1]) {
                            // Builds & shows initial rectangle.
                            const bounds: google.maps.LatLngBoundsLiteral = this.map.buildBounds(this.center);
                            this.map.showRect(bounds);
                        }
                        break;
                }
            }
        }));

        // Checks area limit.
        this.subscriptions.push(this.map.getArea().subscribe((area: number) => {
            if (area > uiConfig.areaLimit) {
                this.wizard.putInError('The area can not exceed 50 hectares');
                this.wizard.updateStep({ bounds: null }, 1);
            } else if (area > 0) {
                // Updates step state.
                this.wizard.updateStep({ bounds: this.map.getBounds() }, 1);
            }
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

}
