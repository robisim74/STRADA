import { interval } from 'rxjs';
import { map, take, concatMap } from 'rxjs/operators';

import * as _googleMaps from '@google/maps';

import { networkDirections } from './models/network-directions';
import { functionsConfig } from './functions-config';

const googleMaps = _googleMaps;

/**
 * Network data function.
 */
export function networkDataFunction(request, response): void {
    try {
        const ways: any = request.body.ways;
        const mode: string = request.body.mode;

        // Instances Google Maps.
        const googleMapsClient = googleMaps.createClient({
            key: functionsConfig.apis.googleMaps.serverKey,
            Promise: Promise
        });
        const data: any[] = [];
        // Builds the stream of directions requests.
        const stream = interval().pipe(
            take(ways.length),
            map((i: number) => ways[i]),
            concatMap((way: any) => networkDirections(way, mode, googleMapsClient))
        );
        // Executes the stream.
        stream.subscribe(
            (edge: any) => { data.push(edge); },
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
