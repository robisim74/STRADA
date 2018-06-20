/**
 * Tag describes the meaning of the particular element to which it is attached.
 */
export interface Tag {

    key: string;
    value: string;

}

/**
 * Relation's member.
 */
export interface Member {

    type: string;
    ref: string;
    role: string;

}

/**
 * Node represents a specific point on the earth's surface defined by its latitude and longitude.
 */
export class Node {

    private nodeId: string;

    private lat: number;

    private lon: number;

    private tags: Tag[];

    private incomingEdges: Edge[];

    private outgoingEdges: Edge[];

}

/**
 * Link between two nodes.
 */
export class Edge {

    private edgeId: string;

    private origin: Node;

    private destination: Node;

    private tags: Tag[];

    private distance: number;

    private duration: number;

    private durationInTraffic: number;

    private velocity: number;

    private density: number;

    private flow: number;

    private linkFlow: number;

    /**
     * Calculates the value of the arc flow and assigns it to the linkFlow attribute.
     */
    public calcLinkFlow(): void {

    }

}

/**
 * Relation is a multi-purpose data structure that documents a relationship between two or more data elements.
 */
export class Relation {

    private relationId: string;

    private members: Member[];

    private tags: Tag[];

}

/**
 * Graph of the transport network.
 */
export class Graph {

    private nodes: Node[];

    private edges: Edge[];

    private relations: Relation[];

    /**
     * Gets the incidence matrix of paths for O/D pairs.
     */
    public getIncidenceMatrix(): boolean[][] {
        return null;
    }

    /**
     * Calculates the set of minimum paths between a source and destination node based on the link duration attribute.
     * k Shortest Paths algorithm in the Eppstein version.
     * @param origin Source node
     * @param destination Destination node
     */
    public getShortestPaths(origin: Node, destination: Node): Node[][] {
        return null;
    }

}
