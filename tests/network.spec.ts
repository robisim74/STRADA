import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { NetworkService } from "src/app/network/network.service";
import { responseForCreateGraph, responseForRoundabout, responseForUpdateGraph } from "./mock-data/network";
import { networkDataForUpdateGraph } from "./mock-data/network-data";

describe('NetworkService', () => {
    let networkService: NetworkService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                NetworkService
            ]
        });

        networkService = TestBed.get(NetworkService);
    });

    describe('createGraph', () => {
        it('should create the graph', fakeAsync(() => {
            networkService.createGraph(responseForCreateGraph).toPromise();
            tick();

            const graph = networkService.getGraph();
            expect(graph.getEdges().length).toBe(19);
            expect(graph.getNodes().length).toBe(12);
            expect(graph.getRelations().length).toBe(0);
        }));
        it('should not accept 0 elements', () => {
            networkService.createGraph({ elements: [] }).subscribe(
                () => { },
                (error: any) => { expect(error).toBe('createGraph'); }
            );
        });
        it('should create the graph for roundabout', fakeAsync(() => {
            networkService.createGraph(responseForRoundabout).toPromise();
            tick();

            const graph = networkService.getGraph();
            expect(graph.getEdges().length).toBe(19);
            expect(graph.getNodes().length).toBe(13);
            expect(graph.getRelations().length).toBe(0);
        }));
    });

    describe('getNetworkData', () => {
        it('should update the graph', fakeAsync(() => {
            networkService.createGraph(responseForUpdateGraph).toPromise();
            tick();

            const graph = networkService.getGraph();
            expect(graph.getEdges().length).toBe(32);
            expect(graph.getNodes().length).toBe(20);
            expect(graph.getRelations().length).toBe(0);

            networkService.updateGraph(networkDataForUpdateGraph).toPromise();
            tick();

            networkService.correctGraph().toPromise();
            tick();

            const edges = graph.getEdges();
            for (const edge of edges) {
                expect(edge.distance).not.toBeNull();
                expect(edge.duration).not.toBeNull();
            }
            expect(edges[0].distance).toBe(14);
            expect(edges[0].duration).toBe(0);
            expect(edges[31].distance).toBe(291);
            expect(edges[31].duration).toBe(0);
        }));
    });
});
