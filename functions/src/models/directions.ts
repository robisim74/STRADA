import { Observable, Observer } from "rxjs";

/**
 * Makes the request to Google Maps Directions API.
 */
export function directions(edge: any, time: Date, googleMapsClient: any): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
        googleMapsClient.directions(buildRequest(edge, time))
            .asPromise()
            .then((response) => {
                // For routes that contain no waypoints, the route will consist of a single leg.
                if (response.json && response.json.routes[0] && response.json.routes[0].legs[0]) {
                    const leg = response.json.routes[0].legs[0];
                    edge.distance = leg.distance.value;
                    edge.duration = leg.duration.value;
                    edge.durationInTraffic = leg.duration_in_traffic.value;
                    observer.next(edge);
                    observer.complete();
                } else {
                    observer.next(edge);
                    observer.complete();
                }
            })
            .catch((err) => {
                observer.error(err);
            });
    });
}

export function buildRequest(edge: any, time: Date): any {
    return {
        origin: { lat: edge.origin.lat, lng: edge.origin.lon },
        destination: { lat: edge.destination.lat, lng: edge.destination.lon },
        mode: 'driving',
        departure_time: time || new Date(Date.now()),
        traffic_model: 'pessimistic',
        units: 'metric'
    };
}
