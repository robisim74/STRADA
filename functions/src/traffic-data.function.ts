import { interval } from 'rxjs';
import { map, take, concatMap } from 'rxjs/operators';

import * as _googleMaps from '@google/maps';

import { trafficDirections } from './models/traffic-directions';
import { functionsConfig } from './functions-config';

const googleMaps = _googleMaps;

/**
 * Traffic data function.
 */
export function trafficDataFunction(request, response): void {
    const edges: any = request.body.edges;
    const time: Date = request.body.time ? new Date(request.body.time) : null;

    try {
        // Instances Google Maps.
        const googleMapsClient = googleMaps.createClient({
            key: functionsConfig.apis.googleMaps.serverKey,
            Promise: Promise
        });
        const data: any[] = [];
        // Builds the stream of directions requests.
        const stream = interval().pipe(
            take(edges.length),
            map((i: number) => edges[i]),
            concatMap((edge: any) => trafficDirections(edge, time, googleMapsClient))
        );
        // Executes the stream.
        stream.subscribe(
            (edge: any) => {
                data.push({
                    edgeId: edge.edgeId,
                    durationInTraffic: edge.durationInTraffic
                });
            },
            (error: any) => {
                // Stops the execution.
                response.status(500).send(error);
            },
            () => {
                const result = JSON.stringify(data);
                response.status(200).send(result);
            }
        );
    } catch (error) {
        response.status(500).send(error);
    }

}
