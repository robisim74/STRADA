import { Observable, Observer } from "rxjs";

import distance from '@turf/distance';
import { point } from '@turf/helpers';

/**
 * Makes the request to Google Maps Directions API to retrieve network data.
 */
export function networkDirections(way: any[], mode: string, googleMapsClient: any): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
        googleMapsClient.directions(buildRequest(way, mode))
            .asPromise()
            .then((response) => {
                if (response.json && response.json.routes[0] && response.json.routes[0].legs.length > 0) {
                    for (let i = 0; i < response.json.routes[0].legs.length; i++) {
                        const leg = response.json.routes[0].legs[i];

                        // To avoid inconsistencies between data in the OpenStreetMap network and data from Google Maps.
                        if (!isInconsistent(leg) && !isGreater(leg)) {
                            let legDistance: number = leg.distance ? leg.distance.value : null;
                            let legDuration: number = leg.duration ? leg.duration.value : null;
                            // Gets polyline for each step.
                            let polylines: any[] = [];
                            for (const step of leg.steps) {
                                if (step.polyline && !isGreater(step)) {
                                    polylines = polylines.concat(step.polyline);
                                } else {
                                    if (legDistance && step.distance && legDuration && step.duration) {
                                        legDistance -= step.distance.value;
                                        legDuration -= step.duration.value;
                                    }
                                }
                            }
                            observer.next({
                                distance: legDistance,
                                duration: legDuration,
                                polylines: polylines
                            });
                        } else {
                            observer.next({ distance: null, duration: null, polylines: null });
                        }
                    }
                    observer.complete();
                } else {
                    for (let i = 0; i <= way.length - 1; i++) {
                        observer.next({ distance: null, duration: null, polylines: null });
                    }
                    observer.complete();
                }
            })
            .catch((error) => {
                observer.error(error);
            });
    });
}

/**
 * Builds a Directions Request object.
 * @param way The current way with waypoints
 * @param mode Mode of transport
 */
export function buildRequest(way: any[], mode: string): any {
    const waypoints = way.filter((waypoint: any, i: number) => {
        return i != 0 && i != way.length - 1;
    });
    return {
        origin: way[0],
        destination: way[way.length - 1],
        mode: mode,
        units: 'metric',
        waypoints: waypoints
    };
}

/**
 * Checks inconsistency in the data.
 * @param leg The current leg in the waypoints
 */
export function isInconsistent(leg: any): boolean {
    // The number of indications is greater than expected.
    if (!leg.steps || leg.steps.length > 3) return true;
}

/**
 * Checks if the distance of the leg/step is much greater than the geodesic distance.
 * @param line The current leg/step in the waypoints
 */
export function isGreater(line: any): any {
    const from = point([line.start_location.lng, line.start_location.lat]);
    const to = point([line.end_location.lng, line.end_location.lat]);
    const geodesicDistance = distance(from, to) * 1000;
    if (geodesicDistance > 0 && line.distance && line.distance.value > geodesicDistance * 3) return true;
    return false;
}
