import { TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { NetworkService } from "src/app/network/network.service";

import { response, roundabout } from "./mock-data/overpass";

describe('NetworkService', () => {
    let service: NetworkService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [
                NetworkService
            ]
        });
    });

    describe('createGraph', () => {
        it('should create the graph', () => {
            service = TestBed.get(NetworkService);
            service.createGraph(response).subscribe(() => {
                const graph = service.getGraph();

                expect(graph.getEdges().length).toBe(19);
                expect(graph.getNodes().length).toBe(12);
                expect(graph.getRelations().length).toBe(0);
            });
        });
        it('should not accept 0 elements', () => {
            service = TestBed.get(NetworkService);
            service.createGraph({ elements: [] }).subscribe(
                () => { },
                (error: any) => { expect(error).toBe('createGraph'); }
            );
        });
        it('should create the graph for roundabout', () => {
            service = TestBed.get(NetworkService);
            service.createGraph(roundabout).subscribe(() => {
                const graph = service.getGraph();

                expect(graph.getEdges().length).toBe(19);
                expect(graph.getNodes().length).toBe(13);
                expect(graph.getRelations().length).toBe(0);
            });
        });
    });
});
