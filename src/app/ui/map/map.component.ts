import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { MapStyle } from './map.style';

@Component({
    selector: 'ui-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit {

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

    constructor() {
        // Map options.
        this.disableDefaultUI = true;
        this.disableDoubleClickZoom = false;
        this.mapTypeId = google.maps.MapTypeId.ROADMAP;
        this.maxZoom = 18;
        this.minZoom = 4;
        this.gestureHandling = 'cooperative';
        // Styled Maps: https://developers.google.com/maps/documentation/javascript/styling
        this.styles = MapStyle
    }

    ngOnInit(): void {
        this.center = new google.maps.LatLng(41.910943, 12.476358);
        this.zoom = 4;
    }

}
