import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard/wizard.service';
import { MapService } from './map.service';
import { MapStyle } from './map.style';
import * as fromUi from '../models/reducers';
import { Step } from '../models/wizard';
import { uiConfig } from '../ui-config';
import { Node } from '../../network/graph';

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

    constructor(
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private map: MapService
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
        this.center = uiConfig.map.center;
        this.zoom = uiConfig.map.zoom;

        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.steps)).subscribe((steps: Step[]) => {
            switch (this.wizard.state.currentStep) {
                case 0:
                    if (steps[0]) {
                        // Updates center map.
                        this.center = this.wizard.state.steps[0].data.center;
                        this.zoom = 16;
                    }
                    break;
                case 2:
                    // Removes the rectangle.
                    this.map.removeRect();
                    break;
            }
        }));

        // Checks area limit.
        this.subscriptions.push(this.map.getArea().subscribe((area: number) => {
            if (area >= uiConfig.areaMinLimit && area <= uiConfig.areaMaxLimit) {
                // Updates step state.
                this.wizard.updateStep({ bounds: this.map.getBounds() }, 1);
            } else if (area) {
                this.wizard.putInError(`The area must be between ${uiConfig.areaMinLimit} and ${uiConfig.areaMaxLimit} hectares`);
                this.wizard.updateStep({ bounds: null }, 1);
            }
        }));

        // mapReset event.
        this.subscriptions.push(this.map.mapReset.subscribe(() => {
            this.center = uiConfig.map.center;
            this.zoom = uiConfig.map.zoom;
        }));

        // nodeSelected event.
        this.subscriptions.push(this.map.nodeSelected.subscribe((node: Node) => {
            this.updateOdPairs(node);
        }));
    }

    sendActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            switch (currentStep) {
                case 1:
                    if (!this.wizard.state.steps[1]) {
                        // Builds & shows initial rectangle.
                        const bounds: google.maps.LatLngBoundsLiteral = this.map.buildBounds(this.center);
                        this.map.showRect(bounds);
                    }
                    break;
            }
        }));
    }

    updateOdPairs(node: Node): void {
        const odPairs: number[][] = this.wizard.state.steps[2] ? this.wizard.state.steps[2].data.odPairs : [];
        if (odPairs.length > 0) {
            // Checks limit.
            if (odPairs.length == uiConfig.maxOdPairs && odPairs[uiConfig.maxOdPairs - 1].length == 2) {
                this.wizard.putInError(`The maximum number of O/D pairs is ${uiConfig.maxOdPairs}`);
            } else {
                const lastOdPair = odPairs[odPairs.length - 1];
                // Checks if last O/D pair is completed.
                if (lastOdPair.length == 2) {
                    odPairs.push([node.label]);
                } else {
                    // Checks if same node.
                    if (lastOdPair[0] == node.label) {
                        this.wizard.putInError(`The origin and destination nodes can not be the same`);
                    } else {
                        lastOdPair.push(node.label);
                    }
                }
            }
        } else {
            odPairs.push([node.label]);
        }
        // Updates step state.
        this.wizard.updateStep({ odPairs: odPairs }, 2);
    }

}
