import { Edge, Node } from "./graph";

/**
 * Path to generic node.
 */
export interface Path {

    pathId: number;
    node: Node;
    edges: Edge[];
    cost: number;

}

/**
 * Heap data structure containing paths.
 */
export class Heap {

    /**
     * The queue of paths.
     */
    private paths: Path[] = [];

    /**
     * Inserts a path into the heap.
     * @param path The path to insert
     */
    public push(path: Path): void {
        this.paths.push({ pathId: path.pathId, node: path.node, edges: path.edges, cost: path.cost });
    }

    /**
     * Removes a path from the heap.
     * @param pathId The id of the path
     */
    public pop(pathId: number): void {
        const index = this.paths.findIndex((path: Path) => path.pathId == pathId);
        this.paths.splice(index, 1);
    }

    /**
     * Returns the shortest path in the heap by cost.
     */
    public getShortestPath(): Path {
        return this.paths.reduce((prev: Path, curr: Path) => prev.cost < curr.cost ? prev : curr);
    }

    public getPaths(): Path[] {
        return this.paths;
    }

}
