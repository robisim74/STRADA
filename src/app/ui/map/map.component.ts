import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { Store, select } from '@ngrx/store';

import { MapService } from './map.service';
import { NetworkService } from '../../network/network.service';
import * as fromUi from '../models/reducers';
import { Step } from '../models/ui-state';
import { MapStyle } from './map.style';
import { OdPair } from '../../network/graph';
import { uiConfig } from '../ui-config';

import { BaseComponent } from '../models/base.component';

@Component({
    selector: 'ui-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MapComponent extends BaseComponent implements OnInit {

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

    currentStep: number;

    constructor(
        private store: Store<fromUi.UiState>,
        private map: MapService,
        private network: NetworkService
    ) {
        super();
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
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            this.currentStep = currentStep;
            switch (currentStep) {
                case 0:
                    this.center = uiConfig.map.center;
                    this.zoom = uiConfig.map.zoom;
                    break;
                case 1:
                    // Builds & shows initial rectangle.
                    const bounds: google.maps.LatLngBoundsLiteral = this.map.buildBounds(this.center);
                    this.map.showRect(bounds);
                    break;
                case 2:
                    // Hides the rectangle.
                    this.map.hideRect();
                    // Shows graph.
                    this.map.showGraph();
                    // Sets centroid.
                    this.map.setCentroid();
                    // Sets map.
                    this.map.setCenter(this.map.getCentroid());
                    this.map.setZoom(17);
                    break;
                case 3:
                    // Clears nodes actions.
                    this.map.clearNodesActions();
                    break;
                case 4:
                    // Hides paths.
                    this.map.hidePaths();
                    break;
            }
        }));
        this.subscriptions.push(this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            switch (this.currentStep) {
                case 0:
                    if (steps[0]) {
                        // Updates center map.
                        this.center = steps[0].data.center;
                        this.zoom = 16;
                    } else {
                        this.center = uiConfig.map.center;
                        this.zoom = uiConfig.map.zoom;
                    }
                    break;
                case 2:
                    if (steps[2]) {
                        // Shows/hides O/D nodes.
                        const odPairs: OdPair[] = steps[2].data.odPairs;
                        this.map.showNodes(odPairs);
                    }
                    break;
                case 3:
                    if (steps[3] && steps[3].data.odPairs) {
                        // Shows/hides O/D paths.
                        const odPairs = steps[3].data.odPairs;
                        this.map.showPaths(odPairs);
                    }
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

}
