import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

/**
 * Responsible for identifying the geographic coordinates of the simulation area,
 * through geocoding or geolocation.
 */
@Injectable() export class LocationService {

    /**
     * Center of the area (latitude, longitude).
     */
    private latLng: google.maps.LatLngLiteral;

    private geocoder: google.maps.Geocoder;

    constructor() {
        this.geocoder = new google.maps.Geocoder();
    }

    public reset(): void {
        this.latLng = null;
    }

    /**
     * Geocoding service.
     * Wraps the Google Maps API geocoding service into an observable.
     * @param address The address to be searched
     * @return An observable of GeocoderResult
     */
    public codeAddress(address: string): Observable<google.maps.GeocoderResult[]> {
        return Observable.create((observer: Observer<google.maps.GeocoderResult[]>) => {
            // Invokes geocode method of Google Maps API geocoding.
            this.geocoder.geocode({ address: address }, (
                (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
                    if (status === google.maps.GeocoderStatus.OK) {
                        observer.next(results);
                        observer.complete();
                    } else {
                        observer.error(status);
                    }
                })
            );
        });
    }

    /**
     * Tries HTML5 geolocation.
     * Wraps the Geolocation API into an observable.
     *
     * @return An observable of Position
     */
    public getCurrentPosition(): Observable<Position> {
        return Observable.create((observer: Observer<Position>) => {
            // Invokes getCurrentPosition method of Geolocation API.
            navigator.geolocation.getCurrentPosition(
                (position: Position) => {
                    observer.next(position);
                    observer.complete();
                },
                (error: PositionError) => {
                    observer.error(error);
                }
            );
        });
    }

    public getLatLng(): google.maps.LatLngLiteral {
        return this.latLng;
    }

    public setLatLng(latLng: google.maps.LatLngLiteral): void {
        this.latLng = latLng;
    }

}
